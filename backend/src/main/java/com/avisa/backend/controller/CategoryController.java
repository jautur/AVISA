package com.avisa.backend.controller;

import com.avisa.backend.dto.CategoryResponse;
import com.avisa.backend.service.ListingService;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
@CrossOrigin(origins = {"http://localhost:4200", "http://127.0.0.1:4200", "https://jautur.github.io"})
public class CategoryController {
    private final ListingService listingService;

    public CategoryController(ListingService listingService) {
        this.listingService = listingService;
    }

    @GetMapping
    public List<CategoryResponse> getCategories() {
        return listingService.findCategories();
    }
}
