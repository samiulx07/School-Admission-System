#!/bin/sh
set -eu

dotnet run --project backend/tests/SchoolAdmission.UnitTests --configuration Release --no-build --no-restore
dotnet run --project backend/tests/SchoolAdmission.IntegrationTests --configuration Release --no-build --no-restore
