package com.avisa.backend.controller;

import com.avisa.backend.dto.ListingCreateRequest;
import com.avisa.backend.dto.ListingResponse;
import com.avisa.backend.dto.ListingStatusRequest;
import com.avisa.backend.dto.ListingUpdateRequest;
import com.avisa.backend.service.ListingService;
import com.avisa.backend.auth.AuthenticatedUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
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

    @GetMapping("/users/me/listings")
    public List<ListingResponse> getMyListings(@AuthenticationPrincipal AuthenticatedUser user) {
        return listingService.findForUser(user);
    }

    @PostMapping("/listings")
    @ResponseStatus(HttpStatus.CREATED)
    public ListingResponse createListing(@Valid @RequestBody ListingCreateRequest request,
                                         @AuthenticationPrincipal AuthenticatedUser user) {
        return listingService.create(request, user);
    }

    @PutMapping("/listings/{id}")
    public ListingResponse updateListing(@PathVariable String id,
                                         @Valid @RequestBody ListingUpdateRequest request,
                                         @AuthenticationPrincipal AuthenticatedUser user) {
        return listingService.update(id, request, user);
    }

    @PatchMapping("/listings/{id}/status")
    public ListingResponse updateListingStatus(@PathVariable String id,
                                               @Valid @RequestBody ListingStatusRequest request,
                                               @AuthenticationPrincipal AuthenticatedUser user) {
        return listingService.updateStatus(id, request.status(), user);
    }

    @DeleteMapping("/listings/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteListing(@PathVariable String id,
                              @AuthenticationPrincipal AuthenticatedUser user) {
        listingService.delete(id, user);
    }
}
