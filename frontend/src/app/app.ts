import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ListingCardComponent, type ListingCardData } from './listing-card.component';
import {
  ListingService,
  type ApiListingCard,
  type ListingCategory,
  type ListingKind,
  type NewListing,
} from './listing.service';

type TabMode = 'needs' | 'offers';

interface ClientProfile {
  name: string;
  role: string;
  city: string;
  servicesReceived: string[];
  servicesProvided: string[];
  rating: number;
  reviews: Array<{ author: string; score: number; text: string }>;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ListingCardComponent],
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App implements OnInit {
  activeTab: TabMode = 'needs';
  showFilters = false;
  searchTerm = '';
  selectedCategory = 'Todas';
  expandedListing: ListingCardData | null = null;
  profilePanelOpen = false;
  toastMessage: string | null = null;

  private toastTimer: number | null = null;
  private readonly listingService = inject(ListingService);
  apiListings: ApiListingCard[] = [];
  isLoadingListings = true;
  hasListingsError = false;
  listingsErrorMessage = 'No se pudieron cargar las publicaciones.';
  isPublishing = false;
  isPublishFormOpen = false;
  isLoadingCategories = false;
  categories: ListingCategory[] = [];
  categoryLoadError = false;
  publishError: string | null = null;

  private readonly formBuilder = inject(NonNullableFormBuilder);
  readonly publishForm = this.formBuilder.group({
    kind: this.formBuilder.control<ListingKind>('needs'),
    title: ['', [Validators.required, Validators.maxLength(100)]],
    summary: ['', [Validators.required, Validators.maxLength(4000)]],
    location: ['', [Validators.required, Validators.maxLength(255)]],
    categoryId: this.formBuilder.control(0, [Validators.required, Validators.min(1)]),
    firstName: ['', [Validators.required, Validators.maxLength(50)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
    phone: ['', [Validators.maxLength(20)]],
    address: ['', [Validators.maxLength(255)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
    price: this.formBuilder.control(0),
  });

  private readonly profileSummary: ClientProfile = {
    name: 'Jorge Prats',
    role: 'Cliente activo',
    city: 'Madrid',
    servicesReceived: ['Reforma de cocina', 'Diseño web', 'Montaje de oficina'],
    servicesProvided: ['Asesoría técnica', 'Instalación y montaje', 'Branding para pymes'],
    rating: 4.9,
    reviews: [
      { author: 'Ana Ruiz', score: 5, text: 'Muy profesional y muy atento en cada detalle.' },
      { author: 'Mario López', score: 5, text: 'Excelente coordinación y comunicación durante todo el proyecto.' },
      { author: 'Laura M.', score: 4, text: 'Servicio rápido y muy bien resuelto.' },
    ],
  };

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
      rating: 4.8,
      reviewCount: 24,
      reviews: [
        { author: 'Jorge', score: 5, text: 'Gran trabajo, muy claro y profesional.' },
        { author: 'Marina', score: 4, text: 'Buena comunicación y buen resultado final.' },
      ],
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
      rating: 4.6,
      reviewCount: 18,
      reviews: [
        { author: 'Sara', score: 5, text: 'Muy puntual y bien organizado.' },
        { author: 'Pablo', score: 4, text: 'Buen trato y buena ejecución.' },
      ],
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
      rating: 4.9,
      reviewCount: 31,
      reviews: [
        { author: 'Lola', score: 5, text: 'Fotos muy limpias y de gran calidad.' },
        { author: 'Jorge', score: 5, text: 'Me encantó el resultado final.' },
      ],
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
      rating: 4.7,
      reviewCount: 22,
      reviews: [
        { author: 'Ana', score: 5, text: 'Muy creativo y organizado en cada paso.' },
        { author: 'Lucía', score: 4, text: 'Resultado claro y muy útil para la marca.' },
      ],
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
      rating: 4.8,
      reviewCount: 27,
      reviews: [
        { author: 'Marta', score: 5, text: 'Acabados impecables y trato muy cercano.' },
        { author: 'Sergio', score: 4, text: 'Cumple muy bien los plazos.' },
      ],
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

  ngOnInit(): void {
    this.loadListings();
  }

  loadListings(): void {
    this.isLoadingListings = true;
    this.hasListingsError = false;

    this.listingService.getListings().subscribe({
      next: (listings) => {
        this.apiListings = listings;
        this.isLoadingListings = false;
      },
      error: (error: HttpErrorResponse) => {
        this.hasListingsError = true;
        this.listingsErrorMessage = error.status === 0
          ? 'No se pudo conectar con la API. Comprueba CORS y que Render esté activo.'
          : error.status >= 500
            ? 'La API no pudo consultar la base de datos. Revisa la conexión de Neon en Render.'
            : 'La API rechazó la petición. Inténtalo de nuevo más tarde.';
        this.isLoadingListings = false;
      },
    });
  }

  get listings(): ListingCardData[] {
    const source = this.apiListings.filter((listing) => listing.kind === this.activeTab);

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
    const categories = this.apiListings
      .filter((listing) => listing.kind === this.activeTab)
      .map((listing) => listing.category);
    return ['Todas', ...new Set(categories)];
  }

  get resultsSummary(): string {
    const label = this.selectedCategory === 'Todas' ? 'todas las categorías' : this.selectedCategory;
    return `${this.listings.length} resultados · ${label}`;
  }

  setTab(tab: TabMode): void {
    this.activeTab = tab;
    this.selectedCategory = 'Todas';
    this.searchTerm = '';
  }

  setCategory(category: string): void {
    this.selectedCategory = category;
    if (category !== 'Todas' && !this.showFilters) {
      this.showFilters = true;
    }
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedCategory = 'Todas';
    this.showFilters = false;
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  get isOfferListing(): boolean {
    return this.publishForm.controls.kind.value === 'offers';
  }

  onListingKindChange(): void {
    this.publishForm.controls.price.setErrors(null);
  }

  openPublishForm(): void {
    this.isPublishFormOpen = true;
    this.publishError = null;
    this.categoryLoadError = false;
    this.isLoadingCategories = true;
    this.listingService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
        this.isLoadingCategories = false;
      },
      error: () => {
        this.categoryLoadError = true;
        this.isLoadingCategories = false;
      },
    });
  }

  closePublishForm(): void {
    if (this.isPublishing) {
      return;
    }
    this.isPublishFormOpen = false;
    this.publishError = null;
  }

  submitListing(): void {
    this.publishForm.markAllAsTouched();
    this.publishError = null;
    if (this.publishForm.invalid || this.isPublishing) {
      return;
    }

    const value = this.publishForm.getRawValue();
    if (value.kind === 'offers' && value.price <= 0) {
      this.publishForm.controls.price.setErrors({ min: true });
      this.publishForm.controls.price.markAsTouched();
      return;
    }

    const newListing: NewListing = {
      kind: value.kind,
      title: value.title.trim(),
      summary: value.summary.trim(),
      location: value.location.trim(),
      categoryId: value.categoryId,
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim(),
      email: value.email.trim(),
      phone: value.phone.trim(),
      address: value.address.trim(),
      password: value.password,
      price: value.kind === 'offers' ? value.price : null,
    };

    this.isPublishing = true;
    this.listingService.createListing(newListing).subscribe({
      next: (createdListing) => {
        this.apiListings = [createdListing, ...this.apiListings];
        this.searchTerm = '';
        this.selectedCategory = 'Todas';
        this.activeTab = createdListing.kind;
        this.isPublishing = false;
        this.isPublishFormOpen = false;
        this.publishForm.reset({
          kind: 'needs', title: '', summary: '', location: '', categoryId: 0,
          firstName: '', lastName: '', email: '', phone: '', address: '', password: '', price: 0,
        });
        this.showToast('Publicación guardada correctamente');
      },
      error: (error: HttpErrorResponse) => {
        this.isPublishing = false;
        this.publishError = error.status === 401
          ? 'El email o la contraseña no son correctos.'
          : error.status === 409
            ? 'Ya existe una cuenta con ese email.'
            : 'No se pudo guardar la publicación. Inténtalo de nuevo.';
      },
    });
  }

  private showToast(message: string): void {
    if (this.toastTimer) {
      window.clearTimeout(this.toastTimer);
    }

    this.toastMessage = message;
    this.toastTimer = window.setTimeout(() => {
      this.toastMessage = null;
    }, 2200);
  }

  openProfilePanel(): void {
    this.profilePanelOpen = true;
  }

  closeProfilePanel(): void {
    this.profilePanelOpen = false;
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

  get clientProfile(): ClientProfile {
    return this.profileSummary;
  }
}
