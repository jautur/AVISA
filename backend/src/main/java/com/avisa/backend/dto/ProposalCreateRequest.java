package com.avisa.backend.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ProposalCreateRequest(
        @NotBlank
        @Size(max = 2000)
        String message,

        @NotNull
        @DecimalMin("0.01")
        @Digits(integer = 8, fraction = 2)
        Double amount
) {
}
