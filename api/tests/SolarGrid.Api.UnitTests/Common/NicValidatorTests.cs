/*
 * File:    NicValidatorTests.cs
 * Module:  Unit Tests
 * Owner:   Ravindu
 * Purpose: Checks the old and new Sri Lankan NIC formats.
 */
using SolarGrid.Api.Common;

namespace SolarGrid.Api.UnitTests.Common;

public class NicValidatorTests
{
    // Old and new formats are both accepted.
    [Theory]
    [InlineData("853400937V")]
    [InlineData("853400937v")]
    [InlineData("858400937X")]    // woman: day 840 means day 340
    [InlineData("198534000937")]
    [InlineData(" 200034501234 ")]
    public void IsValid_AcceptsOldAndNewFormats(string nic)
    {
        Assert.True(NicValidator.IsValid(nic));
    }

    // Wrong length, letters or day numbers are rejected.
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("85340093V")]      // only 8 digits
    [InlineData("853400937A")]     // wrong letter
    [InlineData("19853400093")]    // 11 digits
    [InlineData("850000937V")]     // day 000
    [InlineData("853670937V")]     // day 367
    [InlineData("855000937V")]     // day 500
    [InlineData("198586700937")]   // day 867 (= 367)
    public void IsValid_RejectsBadValues(string? nic)
    {
        Assert.False(NicValidator.IsValid(nic));
    }

    // Normalising makes lower-case and padded input match the stored key.
    [Fact]
    public void Normalize_TrimsAndUpperCases()
    {
        Assert.Equal("853400937V", NicValidator.Normalize(" 853400937v "));
    }
}
