FROM mcr.microsoft.com/dotnet/sdk:10.0.403 AS build
WORKDIR /source
COPY global.json .editorconfig ./
COPY backend/Directory.*.props backend/SchoolAdmission.slnx backend/
COPY backend/src/SchoolAdmission.Domain/*.csproj backend/src/SchoolAdmission.Domain/packages.lock.json backend/src/SchoolAdmission.Domain/
COPY backend/src/SchoolAdmission.Application/*.csproj backend/src/SchoolAdmission.Application/packages.lock.json backend/src/SchoolAdmission.Application/
COPY backend/src/SchoolAdmission.Infrastructure/*.csproj backend/src/SchoolAdmission.Infrastructure/packages.lock.json backend/src/SchoolAdmission.Infrastructure/
COPY backend/src/SchoolAdmission.Api/*.csproj backend/src/SchoolAdmission.Api/packages.lock.json backend/src/SchoolAdmission.Api/
COPY backend/tests/SchoolAdmission.UnitTests/*.csproj backend/tests/SchoolAdmission.UnitTests/packages.lock.json backend/tests/SchoolAdmission.UnitTests/
COPY backend/tests/SchoolAdmission.IntegrationTests/*.csproj backend/tests/SchoolAdmission.IntegrationTests/packages.lock.json backend/tests/SchoolAdmission.IntegrationTests/
RUN dotnet restore backend/SchoolAdmission.slnx --locked-mode
COPY backend/ backend/
RUN dotnet publish backend/src/SchoolAdmission.Api/SchoolAdmission.Api.csproj \
    --configuration Release --no-restore --output /out /p:UseAppHost=false

FROM build AS test-runner
RUN dotnet build backend/SchoolAdmission.slnx --configuration Release --no-restore
ENTRYPOINT ["sh", "backend/run-tests.sh"]

FROM mcr.microsoft.com/dotnet/aspnet:10.0.14 AS runtime
WORKDIR /app
COPY --from=build /out/ .
ENV ASPNETCORE_HTTP_PORTS=8080
USER $APP_UID
EXPOSE 8080
HEALTHCHECK --interval=5s --timeout=5s --start-period=10s --retries=10 \
    CMD ["dotnet", "SchoolAdmission.Api.dll", "--healthcheck"]
ENTRYPOINT ["dotnet", "SchoolAdmission.Api.dll"]
