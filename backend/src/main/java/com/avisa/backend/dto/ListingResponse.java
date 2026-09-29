package com.avisa.backend.dto;

public record ListingResponse(
        String id,
        String kind,
        String title,
        String category,
        String summary,
        String location,
        String priority,
        Double price,
        String createdBy,
        String status,
        boolean featured
) {
}
