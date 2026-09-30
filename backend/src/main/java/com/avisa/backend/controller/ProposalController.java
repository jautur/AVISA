package com.avisa.backend.controller;

import com.avisa.backend.auth.AuthenticatedUser;
import com.avisa.backend.dto.ProposalCreateRequest;
import com.avisa.backend.dto.ProposalResponse;
import com.avisa.backend.dto.ProposalStatusRequest;
import com.avisa.backend.service.ProposalService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
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
public class ProposalController {
    private final ProposalService proposalService;

    public ProposalController(ProposalService proposalService) {
        this.proposalService = proposalService;
    }

    @PostMapping("/listings/{listingId}/proposals")
    @ResponseStatus(HttpStatus.CREATED)
    public ProposalResponse create(@PathVariable String listingId,
                                   @Valid @RequestBody ProposalCreateRequest request,
                                   @AuthenticationPrincipal AuthenticatedUser user) {
        return proposalService.create(listingId, request, user);
    }

    @GetMapping("/listings/{listingId}/proposals")
    public List<ProposalResponse> forListing(@PathVariable String listingId,
                                             @AuthenticationPrincipal AuthenticatedUser user) {
        return proposalService.findForJob(listingId, user);
    }

    @GetMapping("/users/me/proposals")
    public List<ProposalResponse> forProfessional(@AuthenticationPrincipal AuthenticatedUser user) {
        return proposalService.findForProfessional(user);
    }

    @PatchMapping("/proposals/{proposalId}/status")
    public ProposalResponse updateStatus(@PathVariable long proposalId,
                                         @Valid @RequestBody ProposalStatusRequest request,
                                         @AuthenticationPrincipal AuthenticatedUser user) {
        return proposalService.updateStatus(proposalId, request.status(), user);
    }
}
