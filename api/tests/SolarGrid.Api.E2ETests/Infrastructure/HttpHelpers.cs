/*
 * File:    HttpHelpers.cs
 * Module:  E2E Tests
 * Owner:   Ravindu
 * Purpose: Small helpers for JSON calls, logging in and checking status codes.
 */
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;
using SolarGrid.Api.Dtos;

namespace SolarGrid.Api.E2ETests.Infrastructure;

public static class HttpHelpers
{
    // Same JSON rules as the API: camelCase and enums as text.
    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    // Sends a JSON body with POST.
    public static Task<HttpResponseMessage> PostJsonAsync(this HttpClient client, string url, object body)
    {
        return client.PostAsJsonAsync(url, body, Json);
    }

    // Sends a JSON body with PUT.
    public static Task<HttpResponseMessage> PutJsonAsync(this HttpClient client, string url, object body)
    {
        return client.PutAsJsonAsync(url, body, Json);
    }

    // Sends a JSON body with PATCH.
    public static Task<HttpResponseMessage> PatchJsonAsync(this HttpClient client, string url, object body)
    {
        return client.PatchAsJsonAsync(url, body, Json);
    }

    // Reads a JSON body after checking the status code.
    public static async Task<T> ReadAsync<T>(this HttpResponseMessage response, HttpStatusCode expected = HttpStatusCode.OK)
    {
        await response.ShouldHaveStatusAsync(expected);
        var body = await response.Content.ReadFromJsonAsync<T>(Json);
        return body ?? throw new InvalidOperationException("Response body was empty.");
    }

    // Reads an error response and checks its status code.
    public static async Task<ProblemDetails> ReadProblemAsync(this HttpResponseMessage response, HttpStatusCode expected)
    {
        return await response.ReadAsync<ProblemDetails>(expected);
    }

    // Fails with the response body so a wrong status is easy to debug.
    public static async Task ShouldHaveStatusAsync(this HttpResponseMessage response, HttpStatusCode expected)
    {
        if (response.StatusCode == expected)
            return;

        var body = await response.Content.ReadAsStringAsync();
        Assert.Fail($"Expected {(int)expected} {expected} but got {(int)response.StatusCode}: {body}");
    }

    // Logs in and returns the full login response.
    public static async Task<LoginResponse> LoginAsync(this HttpClient client, string username, string password)
    {
        var response = await client.PostJsonAsync("/api/auth/login", new { username, password });
        return await response.ReadAsync<LoginResponse>();
    }

    // A client that sends the given JWT with every request.
    public static HttpClient ClientWithToken(this ApiFactory factory, string token)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    // Logs in with a username and password and returns a ready client.
    public static async Task<HttpClient> ClientForAsync(this ApiFactory factory, string username, string password)
    {
        var login = await factory.CreateClient().LoginAsync(username, password);
        return factory.ClientWithToken(login.Token);
    }

    // A client signed in as the default Backoffice admin.
    public static Task<HttpClient> AdminClientAsync(this ApiFactory factory)
    {
        return factory.ClientForAsync(ApiFactory.AdminEmail, ApiFactory.AdminPassword);
    }
}
