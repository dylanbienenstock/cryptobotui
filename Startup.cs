using System;
using System.IO;
using CryptoBotUI.Hubs;
using CryptoBotUI.Models;
using CryptoBotUI.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;

namespace CryptoBotUI
{
    public class Startup
    {
        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        public IConfiguration Configuration { get; }

        // This method gets called by the runtime. Use this method to add services to the container.
        public void ConfigureServices(IServiceCollection services)
        {
            services.AddCors(options =>
            {
                options.AddPolicy
                (
                    name: "CorsPolicy",
                    configurePolicy: builder => builder
                        .AllowAnyOrigin()
                        .AllowAnyMethod()
                        .AllowAnyHeader()
                );
            });

            services.AddSignalR();

            services.AddDbContext<StrategyContext>(options =>
            {
                var dbPath = Path.Join(Environment.CurrentDirectory, "..");
                var dbFile = Path.Join(dbPath, "Strategies.db");

                options.UseSqlite($"Data Source={dbFile}");
                // options.EnableSensitiveDataLogging();
                // options.EnableDetailedErrors();
            });

            // In production, the Angular files will be served from this directory
            services.AddSpaStaticFiles(configuration =>
            {
                configuration.RootPath = "ClientApp/dist";
            });

            services.AddSingleton<ExchangeNetworkService>();
            services.AddScoped<StrategyService>();
           
           services.Configure<JsonHubProtocolOptions>(options =>
            {
                options.PayloadSerializerSettings = new JsonSerializerSettings
                {
                    ReferenceLoopHandling = ReferenceLoopHandling.Ignore,
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                };
            });
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IHostingEnvironment env)
        {
            app.Use(async (ctx, next) =>
            {
                try
                {
                    await next.Invoke();
                }
                catch (Exception ex)
                {
                    Console.ForegroundColor = ConsoleColor.Black;
                    Console.BackgroundColor = ConsoleColor.Red;
                    Console.WriteLine("[ERROR] " + ex);
                    Console.ResetColor();
                }
            });


            // Wait for the exchange network to connect
            app.UseSignalR(options =>
            {
                options.MapHub<MainHub>("/hub");
            });

            app.UseCors("CorsPolicy");

            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }
            else
            {
                app.UseExceptionHandler("/Error");
                // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
                app.UseHsts();
            }

            // app.UseHttpsRedirection();
            app.UseStaticFiles();
            app.UseSpaStaticFiles();
            app.UseSpa(spa =>
            {
                // To learn more about options for serving an Angular SPA from ASP.NET Core,
                // see https://go.microsoft.com/fwlink/?linkid=864501

                spa.Options.SourcePath = "ClientApp";

                if (env.IsDevelopment())
                {
                    // spa.UseAngularCliServer(npmScript: "start");
                    spa.UseProxyToSpaDevelopmentServer("http://localhost:4200");
                }
            });

            // var exchangeNetworkService = (ExchangeNetworkService)app.ApplicationServices
            //     .GetRequiredService(typeof(ExchangeNetworkService));

            // exchangeNetworkService.Connect().GetAwaiter().GetResult();
            
        }
    }
}
