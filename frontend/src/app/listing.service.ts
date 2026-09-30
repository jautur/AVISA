import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import type { ListingCardData } from './listing-card.component';

export type ListingKind = 'needs' | 'offers';

export interface ApiListing {
  id: string | number;
  kind?: ListingKind;
  categoryId: number;
  title: string;
  category: string;
  summary: string;
  location: string;
  priority: string;
  price: number | null;
  createdBy: string;
  status: string;
  featured: boolean;
}

export interface ListingCategory {
  id: number;
  name: string;
}

export interface NewListing {
  kind: ListingKind;
  title: string;
  summary: string;
  location: string;
  categoryId: number;
  price: number | null;
}

export interface UpdateListing {
  title: string;
  summary: string;
  location: string;
  categoryId: number;
  price: number | null;
}

export interface Proposal {
  id: number;
  listingId: string;
  listingTitle: string;
  professionalName: string;
  amount: number;
  message: string;
  status: 'pendiente' | 'aceptada' | 'rechazada';
}

export type ListingStatus = 'pendiente' | 'en_proceso' | 'completado' | 'cancelado' | 'activo' | 'inactivo' | 'pausado';

export type ApiListingCard = ListingCardData & {
  id: string | number;
  kind: ListingKind;
  categoryId: number;
  priceValue: number | null;
};

const API_URL = 'https://avisa-n4cc.onrender.com/api';

@Injectable({ providedIn: 'root' })
export class ListingService {
  private readonly http = inject(HttpClient);

  getListings(): Observable<ApiListingCard[]> {
    return this.http
      .get<ApiListing[]>(`${API_URL}/listings`)
      .pipe(map((listings) => listings.map((listing) => this.toCard(listing))));
  }

  getMyListings(): Observable<ApiListingCard[]> {
    return this.http
      .get<ApiListing[]>(`${API_URL}/users/me/listings`)
      .pipe(map((listings) => listings.map((listing) => this.toCard(listing))));
  }

  getCategories(): Observable<ListingCategory[]> {
    return this.http.get<ListingCategory[]>(`${API_URL}/categories`);
  }

  createListing(listing: NewListing): Observable<ApiListingCard> {
    return this.http
      .post<ApiListing>(`${API_URL}/listings`, listing)
      .pipe(map((createdListing) => this.toCard(createdListing)));
  }

  updateListing(id: string | number, listing: UpdateListing): Observable<ApiListingCard> {
    return this.http.put<ApiListing>(`${API_URL}/listings/${id}`, listing)
      .pipe(map((updatedListing) => this.toCard(updatedListing)));
  }

  updateStatus(id: string | number, status: ListingStatus): Observable<ApiListingCard> {
    return this.http.patch<ApiListing>(`${API_URL}/listings/${id}/status`, { status })
      .pipe(map((updatedListing) => this.toCard(updatedListing)));
  }

  deleteListing(id: string | number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/listings/${id}`);
  }

  createProposal(listingId: string | number, message: string, amount: number): Observable<Proposal> {
    return this.http.post<Proposal>(`${API_URL}/listings/${listingId}/proposals`, { message, amount });
  }

  getListingProposals(listingId: string | number): Observable<Proposal[]> {
    return this.http.get<Proposal[]>(`${API_URL}/listings/${listingId}/proposals`);
  }

  getMyProposals(): Observable<Proposal[]> {
    return this.http.get<Proposal[]>(`${API_URL}/users/me/proposals`);
  }

  updateProposalStatus(id: number, status: 'aceptada' | 'rechazada'): Observable<Proposal> {
    return this.http.patch<Proposal>(`${API_URL}/proposals/${id}/status`, { status });
  }

  private toCard(listing: ApiListing): ApiListingCard {
    const kind = listing.kind ?? (listing.category.trim().toLocaleLowerCase() === 'profesionales' ? 'offers' : 'needs');
    return {
      id: listing.id,
      kind,
      categoryId: listing.categoryId,
      priceValue: listing.price,
      title: listing.title,
      description: listing.summary,
      category: listing.category,
      price: listing.price === null ? 'A convenir' : `${listing.price} \u20AC`,
      location: listing.location,
      avatar: listing.createdBy.trim().charAt(0).toLocaleUpperCase() || '?',
      userName: listing.createdBy,
      status: listing.status,
      priority: this.toPriority(listing.priority),
    };
  }

  private toPriority(priority: string): ListingCardData['priority'] {
    switch (priority.trim().toLocaleLowerCase()) {
      case 'alta':
      case 'high':
        return 'high';
      case 'media':
      case 'medium':
        return 'medium';
      default:
        return 'low';
    }
  }
}
