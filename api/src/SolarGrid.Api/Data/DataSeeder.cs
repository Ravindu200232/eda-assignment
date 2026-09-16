/*
 * File:    DataSeeder.cs
 * Module:  Data Access
 * Owner:   Ravindu
 * Purpose: Puts starting data into MongoDB.
 *          - Always: a Backoffice account, so someone can log in to the web app.
 *          - When App:SeedDemoData is true and there are no stations yet:
 *            sample staff, prosumers, stations, 7 days of slots and reservations.
 */
using System.Security.Cryptography;
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;
using SolarGrid.Api.Common;
using SolarGrid.Api.Models;
using SolarGrid.Api.Security;

namespace SolarGrid.Api.Data;

public class DataSeeder
{
    private const int SlotMinutes = 120;
    private const string DemoPassword = "Prosumer@123";

    private readonly MongoDbContext _db;
    private readonly IPasswordHasher _hasher;
    private readonly AppClock _clock;
    private readonly AppSettings _settings;
    private readonly ILogger<DataSeeder> _logger;

    // Needs the database, password hasher, clock, settings and a logger.
    public DataSeeder(MongoDbContext db, IPasswordHasher hasher, AppClock clock,
        IOptions<AppSettings> settings, ILogger<DataSeeder> logger)
    {
        _db = db;
        _hasher = hasher;
        _clock = clock;
        _settings = settings.Value;
        _logger = logger;
    }

    // Entry point called once at start-up.
    public async Task SeedAsync()
    {
        await EnsureDefaultAdminAsync();

        if (!_settings.SeedDemoData)
            return;

        var hasStations = await _db.Stations.Find(FilterDefinition<SolarStation>.Empty).AnyAsync();
        if (!hasStations)
            await SeedDemoDataAsync();
    }

    // Creates the admin from settings when no Backoffice account exists.
    private async Task EnsureDefaultAdminAsync()
    {
        var admin = _settings.DefaultAdmin;
        if (string.IsNullOrWhiteSpace(admin.Nic) || string.IsNullOrWhiteSpace(admin.Password))
        {
            _logger.LogWarning("App:DefaultAdmin is not configured, so no default admin was created.");
            return;
        }

        var hasBackoffice = await _db.Users.Find(u => u.Role == UserRole.Backoffice).AnyAsync();
        if (hasBackoffice)
            return;

        var user = NewUser(admin.Nic, admin.FullName, admin.Email, admin.Phone, admin.Password, UserRole.Backoffice, AccountStatus.Active);
        await _db.Users.InsertOneAsync(user);
        _logger.LogInformation("Created default Backoffice account {Email}.", user.Email);
    }

    // Adds a small but realistic data set for demos and screenshots.
    private async Task SeedDemoDataAsync()
    {
        await InsertMissingUsersAsync(DemoUsers());

        var stations = DemoStations();
        await _db.Stations.InsertManyAsync(stations);

        var slots = BuildSlots(stations.Where(s => s.Status == StationStatus.Active));
        var reservations = BuildReservations(stations, slots);
        await _db.Slots.InsertManyAsync(slots);
        await _db.Reservations.InsertManyAsync(reservations);

        _logger.LogInformation("Demo data added: {Stations} stations, {Slots} slots, {Reservations} reservations.",
            stations.Count, slots.Count, reservations.Count);
    }

    // Skips users whose NIC or email is already taken.
    private async Task InsertMissingUsersAsync(IEnumerable<User> users)
    {
        foreach (var user in users)
        {
            var exists = await _db.Users.Find(u => u.Nic == user.Nic || u.Email == user.Email).AnyAsync();
            if (!exists)
                await _db.Users.InsertOneAsync(user);
        }
    }

    // One operator and one prosumer in each account status.
    private List<User> DemoUsers()
    {
        return new List<User>
        {
            NewUser("199023456789", "Nimal Bandara", "operator@solargrid.lk", "0771234567", "Operator@123",
                UserRole.GridOperator, AccountStatus.Active),
            NewProsumer("200034501234", "Kasun Perera", "kasun@example.com", "0712345678",
                "No. 12, Temple Road, Malabe", "CEB-MLB-10021", 5.5, AccountStatus.Active),
            NewProsumer("995671234V", "Nadeesha Silva", "nadeesha@example.com", "0723456789",
                "No. 45, Galle Road, Colombo 03", "CEB-COL-20456", 7.2, AccountStatus.Active),
            NewProsumer("200112304567", "Tharindu Jayasinghe", "tharindu@example.com", "0754567890",
                "No. 8, Peradeniya Road, Kandy", "CEB-KAN-30987", 3.0, AccountStatus.Pending),
            NewProsumer("882345678V", "Dilani Fernando", "dilani@example.com", "0765678901",
                "No. 3, Church Street, Galle", "CEB-GAL-40112", 4.0, AccountStatus.Deactivated)
        };
    }

    // Five stations around Sri Lanka. Malabe is open 24 hours for live demos.
    private List<SolarStation> DemoStations()
    {
        return new List<SolarStation>
        {
            NewStation("SSG-MAL-01", "SLIIT Malabe Campus Microgrid", "New Kandy Road, Malabe",
                6.9147, 79.9729, 150, 600, 12, "00:00", "24:00"),
            NewStation("SSG-COL-01", "Colombo Fort Solar Hub", "Olcott Mawatha, Colombo 01",
                6.9335, 79.8501, 250, 1000, 20, "06:00", "20:00"),
            NewStation("SSG-KAN-01", "Kandy Lakeside Energy Node", "Lake Road, Kandy",
                7.2926, 80.6413, 120, 480, 8, "06:00", "18:00"),
            NewStation("SSG-GAL-01", "Galle Fort Microgrid", "Church Street, Galle Fort",
                6.0269, 80.2170, 100, 400, 8, "07:00", "19:00"),
            NewStation("SSG-NEG-01", "Negombo Beach Solar Station", "Lewis Place, Negombo",
                7.2167, 79.8378, 80, 320, 6, "06:00", "18:00", StationStatus.Inactive)
        };
    }

    // Two-hour slots from yesterday to six days ahead, following each schedule.
    private List<EnergySlot> BuildSlots(IEnumerable<SolarStation> stations)
    {
        var now = _clock.UtcNow;
        var today = _clock.LocalToday;
        var slots = new List<EnergySlot>();

        foreach (var station in stations)
        {
            for (var offset = -1; offset <= 6; offset++)
            {
                var date = today.AddDays(offset);
                var hours = station.Schedule.First(h => h.Day == date.DayOfWeek);

                for (var start = hours.OpenMinutes; start + SlotMinutes <= hours.CloseMinutes; start += SlotMinutes)
                {
                    var startUtc = _clock.ToUtc(date, start);

                    // Keep yesterday's slots for history, but skip ones that already started today.
                    if (offset >= 0 && startUtc <= now)
                        continue;

                    slots.Add(new EnergySlot
                    {
                        Id = ObjectId.GenerateNewId().ToString(),
                        StationId = station.Id,
                        StartTime = startUtc,
                        EndTime = _clock.ToUtc(date, start + SlotMinutes),
                        Capacity = Math.Min(4, station.AvailableBatterySlots),
                        IsOpen = true,
                        CreatedAt = now,
                        UpdatedAt = now
                    });
                }
            }
        }

        return slots;
    }

    // Reservations in every status so each screen has something to show.
    private List<EnergyReservation> BuildReservations(List<SolarStation> stations, List<EnergySlot> slots)
    {
        var now = _clock.UtcNow;
        var today = _clock.LocalToday;
        var malabe = stations[0];
        var colombo = stations[1];
        var kandy = stations[2];
        var galle = stations[3];

        var kasun = ("200034501234", "Kasun Perera");
        var nadeesha = ("995671234V", "Nadeesha Silva");
        var list = new List<EnergyReservation>();

        var nextMalabe = slots.Where(s => s.StationId == malabe.Id && s.StartTime > now).MinBy(s => s.StartTime);
        var laterMalabe = slots.Where(s => s.StationId == malabe.Id && s.StartTime >= now.AddHours(14)).MinBy(s => s.StartTime);

        AddReservation(list, "RSV-DEMO-0001", kasun, malabe, SecondSlotOfDay(slots, malabe, today.AddDays(-1)),
            TradeType.Export, 8, ReservationStatus.Completed);
        AddReservation(list, "RSV-DEMO-0002", kasun, malabe, laterMalabe,
            TradeType.Export, 10, ReservationStatus.Approved);
        AddReservation(list, "RSV-DEMO-0003", kasun, colombo, SecondSlotOfDay(slots, colombo, today.AddDays(2)),
            TradeType.Import, 6, ReservationStatus.Pending);
        AddReservation(list, "RSV-DEMO-0004", nadeesha, kandy, SecondSlotOfDay(slots, kandy, today.AddDays(3)),
            TradeType.Export, 5, ReservationStatus.Cancelled, "Solar panels under maintenance");
        AddReservation(list, "RSV-DEMO-0005", nadeesha, galle, SecondSlotOfDay(slots, galle, today.AddDays(2)),
            TradeType.Import, 12, ReservationStatus.Rejected, "Battery bank reserved for grid balancing");
        AddReservation(list, "RSV-DEMO-0006", nadeesha, malabe, nextMalabe,
            TradeType.Import, 4, ReservationStatus.Approved);

        return list;
    }

    // Adds one demo booking and takes a bay unless it was cancelled or rejected.
    private void AddReservation(List<EnergyReservation> list, string reference, (string Nic, string Name) prosumer,
        SolarStation station, EnergySlot? slot, TradeType type, double kwh, ReservationStatus status, string? reason = null)
    {
        if (slot == null)
            return;

        var reservation = NewReservation(reference, prosumer.Nic, prosumer.Name, station, slot, type, kwh, status, _clock.UtcNow);
        reservation.Reason = reason;
        list.Add(reservation);

        if (status is not (ReservationStatus.Cancelled or ReservationStatus.Rejected))
            slot.BookedCount++;
    }

    // Picks the second slot of a local day, so demo bookings are not at midnight.
    private EnergySlot? SecondSlotOfDay(List<EnergySlot> slots, SolarStation station, DateOnly day)
    {
        return slots
            .Where(s => s.StationId == station.Id && DateOnly.FromDateTime(_clock.ToLocal(s.StartTime)) == day)
            .OrderBy(s => s.StartTime)
            .Skip(1)
            .FirstOrDefault();
    }

    // Builds a reservation document with the fields each status needs.
    private static EnergyReservation NewReservation(string reference, string nic, string name, SolarStation station,
        EnergySlot slot, TradeType type, double kwh, ReservationStatus status, DateTime now)
    {
        var reservation = new EnergyReservation
        {
            Id = ObjectId.GenerateNewId().ToString(),
            ReferenceNo = reference,
            ProsumerNic = nic,
            ProsumerName = name,
            StationId = station.Id,
            StationName = station.Name,
            SlotId = slot.Id,
            StartTime = slot.StartTime,
            EndTime = slot.EndTime,
            TradeType = type,
            EnergyKwh = kwh,
            Status = status,
            CreatedBy = nic,
            CreatedAt = now.AddDays(-2),
            UpdatedAt = now
        };

        if (status is ReservationStatus.Approved or ReservationStatus.Completed)
        {
            reservation.ApprovedBy = "199023456789";
            reservation.ApprovedAt = now.AddDays(-1);
            reservation.QrNonce = Convert.ToHexString(RandomNumberGenerator.GetBytes(8));
        }

        if (status == ReservationStatus.Completed)
        {
            reservation.DeliveredKwh = Math.Round(kwh * 0.95, 2);
            reservation.CompletedBy = "199023456789";
            reservation.CompletedAt = slot.EndTime;
        }

        if (status == ReservationStatus.Cancelled)
        {
            reservation.CancelledBy = nic;
            reservation.CancelledAt = now.AddHours(-3);
        }

        return reservation;
    }

    // Builds an active staff or admin account.
    private User NewUser(string nic, string name, string email, string phone, string password, UserRole role, AccountStatus status)
    {
        var now = _clock.UtcNow;
        return new User
        {
            Nic = NicValidator.Normalize(nic),
            FullName = name,
            Email = email.Trim().ToLowerInvariant(),
            Phone = phone,
            PasswordHash = _hasher.Hash(password),
            Role = role,
            Status = status,
            CreatedAt = now,
            UpdatedAt = now,
            ActivatedAt = status == AccountStatus.Active ? now : null
        };
    }

    // Builds a prosumer with the demo password.
    private User NewProsumer(string nic, string name, string email, string phone,
        string address, string meterNumber, double capacityKw, AccountStatus status)
    {
        var user = NewUser(nic, name, email, phone, DemoPassword, UserRole.Prosumer, status);
        user.Address = address;
        user.MeterNumber = meterNumber;
        user.SolarCapacityKw = capacityKw;
        user.DeactivatedAt = status == AccountStatus.Deactivated ? user.CreatedAt : null;
        return user;
    }

    // Builds a station that keeps the same hours every day of the week.
    private SolarStation NewStation(string code, string name, string address, double latitude, double longitude,
        double solarKw, double storageKwh, int batterySlots, string open, string close,
        StationStatus status = StationStatus.Active)
    {
        var now = _clock.UtcNow;
        return new SolarStation
        {
            Id = ObjectId.GenerateNewId().ToString(),
            Code = code,
            Name = name,
            Address = address,
            Location = SolarStation.ToPoint(latitude, longitude),
            SolarCapacityKw = solarKw,
            StorageCapacityKwh = storageKwh,
            TotalBatterySlots = batterySlots,
            AvailableBatterySlots = batterySlots,
            Schedule = Enum.GetValues<DayOfWeek>()
                .Select(day => new OperatingHours { Day = day, OpenTime = open, CloseTime = close })
                .ToList(),
            Status = status,
            CreatedAt = now,
            UpdatedAt = now
        };
    }
}
