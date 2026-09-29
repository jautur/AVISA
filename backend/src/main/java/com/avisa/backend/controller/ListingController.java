package com.avisa.backend.controller;

import com.avisa.backend.model.Listing;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = {"http://localhost:4200", "http://127.0.0.1:4200"})
public class ListingController {

    private final List<Listing> listings = List.of(
            new Listing(1L, "Diseño de marca", "Necesidades", "Creación de identidad visual para un restaurante local.", "Barcelona", "ALTA", 950, "María", "ABIERTO", true),
            new Listing(2L, "Fotografía de producto", "Profesionales", "Sesión de fotos premium para catálogo online.", "Madrid", "MEDIA", 420, "Luis", "PENDIENTE", true),
            new Listing(3L, "SEO local", "Necesidades", "Optimización de buscadores para negocio con presencia local.", "Valencia", "BAJA", 310, "Ana", "ABIERTO", false),
            new Listing(4L, "Desarrollo web", "Profesionales", "Landing page moderna y responsive para marca emergente.", "Sevilla", "ALTA", 1200, "Sergio", "ABIERTO", true)
    );

    @GetMapping("/listings")
    public List<Listing> getListings() {
        return listings;
    }

    @GetMapping("/listings/{id}")
    public Listing getListingById(@PathVariable Long id) {
        return listings.stream()
                .filter(listing -> listing.getId().equals(id))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Listing no encontrado: " + id));
    }

    @PostMapping("/listings")
    public Listing createListing(@RequestBody Listing listing) {
        return listing;
    }
}
