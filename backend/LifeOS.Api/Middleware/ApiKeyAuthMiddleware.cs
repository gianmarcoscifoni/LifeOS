namespace LifeOS.Api.Middleware;

public class ApiKeyAuthMiddleware(RequestDelegate next, IConfiguration config)
{
    private static readonly HashSet<string> PublicPaths =
        ["/swagger", "/healthz", "/api/auth", "/favicon.ico"];

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path.Value ?? string.Empty;
        if (PublicPaths.Any(p => path.StartsWith(p, StringComparison.OrdinalIgnoreCase)))
        {
            await next(context);
            return;
        }

        var expectedKey = config["ApiKey"];
        if (string.IsNullOrWhiteSpace(expectedKey))
        {
            await next(context);
            return;
        }

        if (!context.Request.Headers.TryGetValue("X-Api-Key", out var providedKey)
            || providedKey != expectedKey)
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            context.Response.ContentType = "application/problem+json";
            await context.Response.WriteAsJsonAsync(new
            {
                type   = "https://tools.ietf.org/html/rfc7235#section-3.1",
                title  = "Unauthorized",
                status = 401,
                detail = "API key mancante o non valido.",
            });
            return;
        }

        await next(context);
    }
}
