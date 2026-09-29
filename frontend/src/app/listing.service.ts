import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import type { ListingCardData } from './listing-card.component';

export type ListingKind = 'needs' | 'offers';

export interface ApiListing {
  id: string;
  kind: ListingKind;
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
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  price: number | null;
}

export type ApiListingCard = ListingCardData & { id: string; kind: ListingKind };

const API_URL = 'https://avisa-n4cc.onrender.com/api';

@Injectable({ providedIn: 'root' })
export class ListingService {
  private readonly http = inject(HttpClient);

  getListings(): Observable<ApiListingCard[]> {
    return this.http
      .get<ApiListing[]>(`${API_URL}/listings`)
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

  private toCard(listing: ApiListing): ApiListingCard {
    return {
      id: listing.id,
      kind: listing.kind,
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
