import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface ListingReview {
  author: string;
  score: number;
  text: string;
}

export interface ListingCardData {
  id?: string | number;
  kind?: 'needs' | 'offers';
  title: string;
  description: string;
  category: string;
  price: string;
  location: string;
  avatar: string;
  userName: string;
  status: string;
  priority: 'high' | 'medium' | 'low';
  rating?: number;
  reviewCount?: number;
  reviews?: ListingReview[];
}

@Component({
  selector: 'app-listing-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './listing-card.component.html',
  styleUrl: './listing-card.component.css',
})
export class ListingCardComponent {
  @Input() listing!: ListingCardData;
  @Output() view = new EventEmitter<ListingCardData>();
}
