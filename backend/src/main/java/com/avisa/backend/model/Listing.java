package com.avisa.backend.model;

public class Listing {
    private Long id;
    private String title;
    private String category;
    private String summary;
    private String location;
    private String priority;
    private double price;
    private String createdBy;
    private String status;
    private boolean featured;

    public Listing() {
    }

    public Listing(Long id, String title, String category, String summary, String location,
                   String priority, double price, String createdBy, String status, boolean featured) {
        this.id = id;
        this.title = title;
        this.category = category;
        this.summary = summary;
        this.location = location;
        this.priority = priority;
        this.price = price;
        this.createdBy = createdBy;
        this.status = status;
        this.featured = featured;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public double getPrice() {
        return price;
    }

    public void setPrice(double price) {
        this.price = price;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public boolean isFeatured() {
        return featured;
    }

    public void setFeatured(boolean featured) {
        this.featured = featured;
    }
}
