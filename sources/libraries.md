# Libraries We Installed

A *library* (or *package*) is ready-made code that we download instead of writing it ourselves.
The versions below are the exact ones in the project files. Licences were read from each package's
official NuGet page / package metadata.

## Web API (C#, from nuget.org)

| Library | Version | Used in | What it does (plain English) | Licence | Link |
|---|---|---|---|---|---|
| MongoDB.Driver | 3.11.2 | API | Lets the C# code read and write data in MongoDB | Apache-2.0 | https://www.nuget.org/packages/MongoDB.Driver |
| Microsoft.AspNetCore.Authentication.JwtBearer | 10.0.12 | API | Checks the login token sent with each request | MIT | https://www.nuget.org/packages/Microsoft.AspNetCore.Authentication.JwtBearer |
| Swashbuckle.AspNetCore | 10.2.3 | API | Builds the Swagger page for trying the API in a browser | MIT | https://www.nuget.org/packages/Swashbuckle.AspNetCore |
| BCrypt.Net-Next | 4.2.0 | API | Stores passwords as safe one-way hashes | MIT | https://www.nuget.org/packages/BCrypt.Net-Next |

## API tests

| Library | Version | Used in | What it does (plain English) | Licence | Link |
|---|---|---|---|---|---|
| xunit | 2.9.3 | Unit + E2E tests | The testing framework that runs our automatic checks | Apache-2.0 | https://www.nuget.org/packages/xunit |
| xunit.runner.visualstudio | 3.1.4 | Unit + E2E tests | Lets Visual Studio and `dotnet test` find the tests | Apache-2.0 | https://www.nuget.org/packages/xunit.runner.visualstudio |
| Microsoft.NET.Test.Sdk | 17.14.1 | Unit + E2E tests | The .NET test platform | MIT | https://www.nuget.org/packages/Microsoft.NET.Test.Sdk |
| coverlet.collector | 6.0.4 | Unit + E2E tests | Measures how much of the code the tests run | MIT | https://www.nuget.org/packages/coverlet.collector |
| NSubstitute | 6.2.0 | Unit tests | Creates fake repositories so rules can be tested without a database | BSD-3-Clause | https://www.nuget.org/packages/NSubstitute |
| Microsoft.Extensions.TimeProvider.Testing | 10.10.0 | Unit tests | A fake clock, so "7 days" and "12 hours" rules can be tested at any time | MIT | https://www.nuget.org/packages/Microsoft.Extensions.TimeProvider.Testing |
| Microsoft.AspNetCore.Mvc.Testing | 10.0.12 | E2E tests | Starts the complete API inside the test run | MIT | https://www.nuget.org/packages/Microsoft.AspNetCore.Mvc.Testing |

## Tools (not part of the code)

| Tool | Version | Purpose |
|---|---|---|
| .NET SDK | 10.0.401 | Builds and runs the API |
| ASP.NET Core Hosting Bundle | 10.0.12 | Lets IIS run the API |
| MongoDB Community Server | 8.3 | The database |
| MongoDB Compass | 1.50 | Viewing the data during development |
| GitHub CLI | 2.101.0 | Creating pull requests |
