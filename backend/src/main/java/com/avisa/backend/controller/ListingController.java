package com.avisa.backend.controller;

import com.avisa.backend.dto.ListingCreateRequest;
import com.avisa.backend.dto.ListingResponse;
import com.avisa.backend.service.ListingService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = {"http://localhost:4200", "http://127.0.0.1:4200", "https://jautur.github.io"})
public class ListingController {
    private final ListingService listingService;

    public ListingController(ListingService listingService) {
        this.listingService = listingService;
    }

    @GetMapping("/listings")
    public List<ListingResponse> getListings() {
        return listingService.findAll();
    }

    @GetMapping("/listings/{id}")
    public ListingResponse getListingById(@PathVariable String id) {
        return listingService.findById(id);
    }

    @PostMapping("/listings")
    @ResponseStatus(HttpStatus.CREATED)
    public ListingResponse createListing(@Valid @RequestBody ListingCreateRequest request) {
        return listingService.create(request);
    }
}
