import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ListingCardComponent, type ListingCardData } from './listing-card.component';

type TabMode = 'needs' | 'offers';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ListingCardComponent],
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  activeTab: TabMode = 'needs';
  showFilters = false;
  searchTerm = '';
  selectedCategory = 'Todas';
  expandedListing: ListingCardData | null = null;

  private readonly availableFilterOptions = [
    'Todas',
    'Diseño web',
    'Reformas',
    'Fotografía',
    'Educación',
    'Jardinería',
    'Montajes',
  ];

  private readonly needsListings: ListingCardData[] = [
    {
      title: 'Necesito un proyecto web para mi negocio',
      description: 'Busco una persona con experiencia para crear una landing moderna y optimizada.',
      category: 'Diseño web',
      price: '900€',
      location: 'Madrid',
      avatar: 'A',
      userName: 'Ana Ruiz',
      status: 'Abierto',
      priority: 'high',
    },
    {
      title: 'Reforma integral de cocina',
      description: 'Necesito ayuda para renovar una cocina pequeña con materiales de calidad.',
      category: 'Reformas',
      price: '2.500€',
      location: 'Barcelona',
      avatar: 'M',
      userName: 'Mario López',
      status: 'Pendiente',
      priority: 'medium',
    },
    {
      title: 'Fotografía de producto para tienda',
      description: 'Busco fotógrafo para sesiones de productos con estilo premium y limpieza.',
      category: 'Fotografía',
      price: '380€',
      location: 'Valencia',
      avatar: 'S',
      userName: 'Sara Gómez',
      status: 'Activo',
      priority: 'low',
    },
    {
      title: 'Busco clases de inglés para adultos',
      description: 'Necesito apoyo para reforzar conversación y pronunciación de forma práctica.',
      category: 'Educación',
      price: '25€/h',
      location: 'Sevilla',
      avatar: 'L',
      userName: 'Laura M.',
      status: 'Disponible',
      priority: 'low',
    },
    {
      title: 'Necesito montar mobiliario de oficina',
      description: 'Quiero ayuda para montar y ordenar un espacio de trabajo con eficiencia.',
      category: 'Montajes',
      price: '600€',
      location: 'Bilbao',
      avatar: 'J',
      userName: 'Javier T.',
      status: 'Urgente',
      priority: 'high',
    },
    {
      title: 'Busco mantenimiento de jardín',
      description: 'Necesito un servicio regular para poda y cuidado del exterior.',
      category: 'Jardinería',
      price: '140€/visita',
      location: 'Zaragoza',
      avatar: 'P',
      userName: 'Pedro V.',
      status: 'Abierto',
      priority: 'medium',
    },
  ];

  private readonly offersListings: ListingCardData[] = [
    {
      title: 'Diseño de marca para pequeñas empresas',
      description: 'Ofrezco identidad visual completa con tono moderno y posicionamiento claro.',
      category: 'Diseño web',
      price: '1.200€',
      location: 'Málaga',
      avatar: 'D',
      userName: 'Daniel P.',
      status: 'Disponible',
      priority: 'high',
    },
    {
      title: 'Reformas de baños y cocinas',
      description: 'Servicios de renovación, instalación y acabado para viviendas y locales.',
      category: 'Reformas',
      price: '3.000€',
      location: 'Alicante',
      avatar: 'R',
      userName: 'Raúl F.',
      status: 'Activa',
      priority: 'medium',
    },
    {
      title: 'Sesiones de fotografía de producto',
      description: 'Ayudo a marcas a presentar sus productos con estilo premium y detalle.',
      category: 'Fotografía',
      price: '420€',
      location: 'Valencia',
      avatar: 'C',
      userName: 'Cristina G.',
      status: 'Disponible',
      priority: 'low',
    },
    {
      title: 'Clases intensivas de inglés',
      description: 'Imparto sesiones para mejorar conversación, pronunciación y confianza.',
      category: 'Educación',
      price: '30€/h',
      location: 'Sevilla',
      avatar: 'N',
      userName: 'Nora T.',
      status: 'Abierta',
      priority: 'low',
    },
    {
      title: 'Montaje de muebles para hogares y oficinas',
      description: 'Instalación, ajuste y acabado completo con atención al detalle.',
      category: 'Montajes',
      price: '550€',
      location: 'Valladolid',
      avatar: 'E',
      userName: 'Esteban V.',
      status: 'Disponible',
      priority: 'high',
    },
    {
      title: 'Mantenimiento ecológico y jardinería',
      description: 'Cuidado de exteriores con soluciones sostenibles y personalizadas.',
      category: 'Jardinería',
      price: '180€/visita',
      location: 'Zaragoza',
      avatar: 'I',
      userName: 'Irene M.',
      status: 'Activa',
      priority: 'medium',
    },
  ];

  get listings(): ListingCardData[] {
    const source = this.activeTab === 'needs' ? this.needsListings : this.offersListings;

    return source.filter((listing) => {
      const matchesSearch =
        !this.searchTerm ||
        listing.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        listing.category.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        listing.location.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesCategory =
        this.selectedCategory === 'Todas' || listing.category === this.selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }

  get filterOptions(): string[] {
    return this.availableFilterOptions;
  }

  setTab(tab: TabMode): void {
    this.activeTab = tab;
    this.selectedCategory = 'Todas';
    this.searchTerm = '';
  }

  setCategory(category: string): void {
    this.selectedCategory = category;
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  publishNewListing(): void {
    const source = this.activeTab === 'needs' ? this.needsListings : this.offersListings;

    if (!source.length) {
      return;
    }

    const randomIndex = Math.floor(Math.random() * source.length);
    const base = source[randomIndex];

    const cloned: ListingCardData = {
      ...base,
      title: `${base.title} (copia)`,
      status: 'Nuevo',
      userName: 'Tú',
      avatar: 'N',
      price: base.price,
      description: `${base.description} Nueva publicación generada a partir de una oferta existente.`,
    };

    source.unshift(cloned);
    this.searchTerm = '';
    this.selectedCategory = 'Todas';
  }

  openListingDetail(listing: ListingCardData): void {
    this.expandedListing = { ...listing };
  }

  closeListingDetail(): void {
    this.expandedListing = null;
  }

  viewMore(listing: ListingCardData): void {
    this.openListingDetail(listing);
  }
}
