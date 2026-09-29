import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface ListingCardData {
  title: string;
  description: string;
  category: string;
  price: string;
  location: string;
  avatar: string;
  userName: string;
  status: string;
  priority: 'high' | 'medium' | 'low';
}

@Component({
  selector: 'app-listing-card',
  standalone: true,
  templateUrl: './listing-card.component.html',
  styleUrl: './listing-card.component.css',
})
export class ListingCardComponent {
  @Input() listing!: ListingCardData;
  @Output() view = new EventEmitter<ListingCardData>();
}
