using System.ComponentModel.DataAnnotations;

namespace SchoolAdmission.Api.Configuration;

public sealed class AdmissionOptions
{
    public const string SectionName = "Admission";

    [Range(1, int.MaxValue)]
    public int HoldDurationSeconds { get; init; } = 600;
}
