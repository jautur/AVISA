package com.avisa.backend.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record ListingUpdateRequest(
        @NotBlank
        @Size(max = 100)
        String title,

        @NotBlank
        @Size(max = 4000)
        String summary,

        @NotBlank
        @Size(max = 255)
        String location,

        @NotNull
        @Positive
        Long categoryId,

        @DecimalMin("0.0")
        Double price
) {
}
