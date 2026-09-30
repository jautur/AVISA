package com.avisa.backend.dto;

public record ProposalResponse(
        Long id,
        String listingId,
        String listingTitle,
        String professionalName,
        Double amount,
        String message,
        String status
) {
}
