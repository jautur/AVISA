package com.avisa.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ProposalStatusRequest(
        @NotBlank
        @Pattern(regexp = "aceptada|rechazada")
        String status
) {
}
