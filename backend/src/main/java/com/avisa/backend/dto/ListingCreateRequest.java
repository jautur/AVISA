package com.avisa.backend.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record ListingCreateRequest(
        @NotBlank
        @Pattern(regexp = "needs|offers")
        String kind,

        @NotBlank
        @Size(max = 100)
        String title,

        @NotBlank
        String summary,

        @NotBlank
        @Size(max = 255)
        String location,

        @NotNull
        @Positive
        Long categoryId,

        @NotBlank
        @Size(max = 50)
        String firstName,

        @NotBlank
        @Size(max = 100)
        String lastName,

        @NotBlank
        @Email
        @Size(max = 100)
        String email,

        @NotBlank
        @Size(min = 8, max = 72)
        String password,

        @DecimalMin("0.0")
        Double price
) {
}
