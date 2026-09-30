package com.avisa.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ListingStatusRequest(
        @NotBlank
        @Pattern(regexp = "pendiente|en_proceso|completado|cancelado|activo|inactivo|pausado")
        String status
) {
}
