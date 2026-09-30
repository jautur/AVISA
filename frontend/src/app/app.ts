import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ListingCardComponent, type ListingCardData } from './listing-card.component';
import { AuthService, type AccountType, type LoginPayload, type RegisterPayload, type UserProfile } from './auth.service';
import {
  ListingService,
  type ApiListingCard,
  type ListingStatus,
  type ListingCategory,
  type ListingKind,
  type NewListing,
  type Proposal,
  type UpdateListing,
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
  authPanelOpen = false;
  authMode: 'login' | 'register' = 'login';
  authError: string | null = null;
  authMessage: string | null = null;
  isAuthenticating = false;
  currentUser: UserProfile | null = null;
  toastMessage: string | null = null;

  private toastTimer: number | null = null;
  private readonly listingService = inject(ListingService);
  private readonly authService = inject(AuthService);
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
  editingListing: ApiListingCard | null = null;
  myListings: ApiListingCard[] = [];
  isLoadingMyListings = false;
  myListingsError: string | null = null;
  listingActionError: string | null = null;
  showProposalForm = false;
  isSendingProposal = false;
  proposalError: string | null = null;
  myProposals: Proposal[] = [];
  isLoadingMyProposals = false;
  myProposalsError: string | null = null;
  proposalsByListing: Record<string, Proposal[]> = {};
  proposalListOpenFor: string | null = null;
  isLoadingProposalsFor: string | null = null;
  proposalListError: string | null = null;

  private readonly formBuilder = inject(NonNullableFormBuilder);
  readonly publishForm = this.formBuilder.group({
    kind: this.formBuilder.control<ListingKind>('needs'),
    title: ['', [Validators.required, Validators.maxLength(100)]],
    summary: ['', [Validators.required, Validators.maxLength(4000)]],
    location: ['', [Validators.required, Validators.maxLength(255)]],
    categoryId: this.formBuilder.control(0, [Validators.required, Validators.min(1)]),
    price: this.formBuilder.control(0),
  });

  readonly proposalForm = this.formBuilder.group({
    message: ['', [Validators.required, Validators.maxLength(2000)]],
    amount: this.formBuilder.control(0, [Validators.required, Validators.min(0.01)]),
  });

  readonly loginForm = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
    password: ['', [Validators.required]],
  });

  readonly registerForm = this.formBuilder.group({
    firstName: ['', [Validators.required, Validators.maxLength(50)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
    phone: ['', [Validators.maxLength(20)]],
    address: ['', [Validators.maxLength(255)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
    accountType: this.formBuilder.control<AccountType>('cliente'),
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
    this.authService.restoreSession().subscribe((user) => this.currentUser = user);
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
    const source = this.apiListings.filter((listing) => listing.kind === this.activeTab
      && this.isPublicListing(listing));

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
    if (!this.currentUser) {
      this.publishAfterAuthentication = true;
      this.authMessage = 'Inicia sesión o crea una cuenta para publicar.';
      this.openAuthPanel('login');
      return;
    }

    this.isPublishFormOpen = true;
    this.editingListing = null;
    this.publishForm.reset({ kind: 'needs', title: '', summary: '', location: '', categoryId: 0, price: 0 });
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

  editListing(listing: ApiListingCard): void {
    this.profilePanelOpen = false;
    this.editingListing = listing;
    this.publishForm.reset({
      kind: listing.kind,
      title: listing.title,
      summary: listing.description,
      location: listing.location,
      categoryId: listing.categoryId,
      price: listing.priceValue ?? 0,
    });
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
    this.editingListing = null;
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

    const valueToSave: NewListing = {
      kind: value.kind,
      title: value.title.trim(),
      summary: value.summary.trim(),
      location: value.location.trim(),
      categoryId: value.categoryId,
      price: value.kind === 'offers' ? value.price : null,
    };
    const updatePayload: UpdateListing = {
      title: valueToSave.title,
      summary: valueToSave.summary,
      location: valueToSave.location,
      categoryId: valueToSave.categoryId,
      price: valueToSave.price,
    };

    this.isPublishing = true;
    const listingBeingEdited = this.editingListing;
    const saveRequest = listingBeingEdited
      ? this.listingService.updateListing(listingBeingEdited.id, updatePayload)
      : this.listingService.createListing(valueToSave);
    saveRequest.subscribe({
      next: (savedListing) => {
        if (listingBeingEdited) {
          this.replaceListing(savedListing);
        } else {
          this.apiListings = [savedListing, ...this.apiListings];
          this.myListings = [savedListing, ...this.myListings];
        }
        this.searchTerm = '';
        this.selectedCategory = 'Todas';
        this.activeTab = savedListing.kind;
        this.isPublishing = false;
        this.isPublishFormOpen = false;
        this.editingListing = null;
        this.publishForm.reset({
          kind: 'needs', title: '', summary: '', location: '', categoryId: 0, price: 0,
        });
        if (!listingBeingEdited && this.currentUser && this.currentUser.accountType !== 'ambos'
          && ((savedListing.kind === 'offers' && this.currentUser.accountType === 'cliente')
            || (savedListing.kind === 'needs' && this.currentUser.accountType === 'profesional'))) {
          this.currentUser = { ...this.currentUser, accountType: 'ambos' };
        }
        this.showToast(listingBeingEdited ? 'Publicación actualizada' : 'Publicación guardada correctamente');
      },
      error: (error: HttpErrorResponse) => {
        this.isPublishing = false;
        this.publishError = error.status === 401
          ? 'Tu sesión ha caducado. Inicia sesión de nuevo para publicar.'
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
    this.loadMyListings();
    this.loadMyProposals();
  }

  loadMyListings(): void {
    this.isLoadingMyListings = true;
    this.myListingsError = null;
    this.listingActionError = null;
    this.listingService.getMyListings().subscribe({
      next: (listings) => {
        this.myListings = listings;
        this.isLoadingMyListings = false;
      },
      error: () => {
        this.myListingsError = 'No se pudieron cargar tus publicaciones. Vuelve a intentarlo.';
        this.isLoadingMyListings = false;
      },
    });
  }

  loadMyProposals(): void {
    this.isLoadingMyProposals = true;
    this.myProposalsError = null;
    this.listingService.getMyProposals().subscribe({
      next: (proposals) => {
        this.myProposals = proposals;
        this.isLoadingMyProposals = false;
      },
      error: () => {
        this.myProposalsError = 'No se pudieron cargar tus propuestas.';
        this.isLoadingMyProposals = false;
      },
    });
  }

  openListingProposals(listing: ApiListingCard): void {
    if (this.proposalListOpenFor === listing.id.toString()) {
      this.proposalListOpenFor = null;
      return;
    }
    this.proposalListOpenFor = listing.id.toString();
    this.isLoadingProposalsFor = listing.id.toString();
    this.proposalListError = null;
    this.listingService.getListingProposals(listing.id).subscribe({
      next: (proposals) => {
        this.proposalsByListing[listing.id.toString()] = proposals;
        this.isLoadingProposalsFor = null;
      },
      error: () => {
        this.proposalListError = 'No se pudieron cargar las propuestas para esta necesidad.';
        this.isLoadingProposalsFor = null;
      },
    });
  }

  reviewProposal(proposal: Proposal, status: 'aceptada' | 'rechazada'): void {
    this.proposalListError = null;
    this.listingService.updateProposalStatus(proposal.id, status).subscribe({
      next: () => {
        this.loadMyListings();
        this.loadListings();
        this.proposalListOpenFor = proposal.listingId;
        this.isLoadingProposalsFor = proposal.listingId;
        this.listingService.getListingProposals(proposal.listingId).subscribe({
          next: (proposals) => {
            this.proposalsByListing[proposal.listingId] = proposals;
            this.isLoadingProposalsFor = null;
          },
          error: () => {
            this.proposalListError = 'No se pudieron actualizar las propuestas.';
            this.isLoadingProposalsFor = null;
          },
        });
        this.showToast(status === 'aceptada' ? 'Propuesta aceptada; el trabajo está en proceso' : 'Propuesta rechazada');
      },
      error: (error: HttpErrorResponse) => {
        this.proposalListError = error.status === 409
          ? 'La necesidad ya no está disponible para revisar propuestas.'
          : 'No se pudo actualizar la propuesta. Inténtalo de nuevo.';
      },
    });
  }

  canSubmitProposal(listing: ListingCardData): boolean {
    if (listing.kind !== 'needs') return false;
    if (!this.currentUser) return true;
    const ownName = `${this.currentUser.firstName} ${this.currentUser.lastName}`.trim().toLocaleLowerCase();
    return this.currentUser.accountType !== 'cliente'
      && listing.userName.trim().toLocaleLowerCase() !== ownName;
  }

  openProposalForm(): void {
    this.proposalError = null;
    if (!this.currentUser) {
      this.authMessage = 'Inicia sesión con una cuenta profesional para enviar una propuesta.';
      this.openAuthPanel('login');
      return;
    }
    if (this.currentUser.accountType === 'cliente') {
      this.proposalError = 'Necesitas una cuenta profesional para enviar propuestas.';
      return;
    }
    this.proposalForm.reset({ message: '', amount: 0 });
    this.showProposalForm = true;
  }

  submitProposal(): void {
    this.proposalForm.markAllAsTouched();
    this.proposalError = null;
    if (this.proposalForm.invalid || this.isSendingProposal || !this.expandedListing?.id) return;

    const form = this.proposalForm.getRawValue();
    this.isSendingProposal = true;
    this.listingService.createProposal(this.expandedListing.id, form.message.trim(), form.amount).subscribe({
      next: (proposal) => {
        this.isSendingProposal = false;
        this.showProposalForm = false;
        this.proposalForm.reset({ message: '', amount: 0 });
        this.myProposals = [proposal, ...this.myProposals];
        this.showToast('Propuesta enviada');
      },
      error: (error: HttpErrorResponse) => {
        this.isSendingProposal = false;
        this.proposalError = error.status === 409
          ? 'Ya enviaste una propuesta pendiente o esta necesidad ya no acepta respuestas.'
          : error.status === 403
            ? 'Solo las cuentas profesionales pueden enviar propuestas.'
            : 'No se pudo enviar la propuesta. Inténtalo de nuevo.';
      },
    });
  }

  proposalStatusLabel(status: Proposal['status']): string {
    return status === 'pendiente' ? 'Pendiente' : status === 'aceptada' ? 'Aceptada' : 'Rechazada';
  }

  setListingStatus(listing: ApiListingCard, status: ListingStatus): void {
    this.listingActionError = null;
    this.listingService.updateStatus(listing.id, status).subscribe({
      next: (updated) => {
        this.replaceListing(updated);
        this.showToast('Estado de la publicación actualizado');
      },
      error: () => this.listingActionError = 'No se pudo cambiar el estado. Actualiza la lista e inténtalo de nuevo.',
    });
  }

  deleteListing(listing: ApiListingCard): void {
    if (!window.confirm(`¿Quieres eliminar «${listing.title}»? Esta acción no se puede deshacer.`)) {
      return;
    }
    this.listingActionError = null;
    this.listingService.deleteListing(listing.id).subscribe({
      next: () => {
        this.myListings = this.myListings.filter((item) => item.id !== listing.id);
        this.apiListings = this.apiListings.filter((item) => item.id !== listing.id);
        this.showToast('Publicación eliminada');
      },
      error: () => this.listingActionError = 'No se pudo eliminar la publicación. Inténtalo de nuevo.',
    });
  }

  listingStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pendiente: 'Pendiente', en_proceso: 'En proceso', completado: 'Completado', cancelado: 'Cancelado',
      activo: 'Activo', pausado: 'Pausado', inactivo: 'Inactivo',
    };
    return labels[status] ?? status;
  }

  private replaceListing(updated: ApiListingCard): void {
    const alreadyInPublicFeed = this.apiListings.some((item) => item.id === updated.id);
    this.apiListings = alreadyInPublicFeed
      ? this.apiListings.map((item) => item.id === updated.id ? updated : item)
      : this.isPublicListing(updated) ? [updated, ...this.apiListings] : this.apiListings;
    this.myListings = this.myListings.map((item) => item.id === updated.id ? updated : item);
  }

  private isPublicListing(listing: ApiListingCard): boolean {
    return listing.kind === 'offers'
      ? listing.status === 'activo'
      : listing.status === 'pendiente' || listing.status === 'en_proceso';
  }

  openAuthPanel(mode: 'login' | 'register' = 'login'): void {
    this.authMode = mode;
    this.authError = null;
    this.authPanelOpen = true;
  }

  closeAuthPanel(): void {
    if (!this.isAuthenticating) {
      this.authPanelOpen = false;
      this.authError = null;
      this.authMessage = null;
      this.publishAfterAuthentication = false;
    }
  }

  submitLogin(): void {
    this.loginForm.markAllAsTouched();
    if (this.loginForm.invalid || this.isAuthenticating) return;

    const value = this.loginForm.getRawValue();
    const payload: LoginPayload = { email: value.email.trim(), password: value.password };
    this.isAuthenticating = true;
    this.authError = null;
    this.authService.login(payload).subscribe({
      next: (session) => this.finishAuthentication(session.user),
      error: (error: HttpErrorResponse) => this.failAuthentication(error),
    });
  }

  submitRegistration(): void {
    this.registerForm.markAllAsTouched();
    if (this.registerForm.invalid || this.isAuthenticating) return;

    const value = this.registerForm.getRawValue();
    const payload: RegisterPayload = {
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim(),
      email: value.email.trim(),
      phone: value.phone.trim(),
      address: value.address.trim(),
      password: value.password,
      accountType: value.accountType,
    };
    this.isAuthenticating = true;
    this.authError = null;
    this.authService.register(payload).subscribe({
      next: (session) => this.finishAuthentication(session.user),
      error: (error: HttpErrorResponse) => this.failAuthentication(error),
    });
  }

  logout(): void {
    this.authService.logout().subscribe(() => {
      this.currentUser = null;
      this.profilePanelOpen = false;
      this.showToast('Has cerrado sesión');
    });
  }

  private finishAuthentication(user: UserProfile): void {
    this.currentUser = user;
    this.isAuthenticating = false;
    this.authPanelOpen = false;
    this.authError = null;
    this.authMessage = null;
    this.loginForm.reset({ email: '', password: '' });
    this.registerForm.reset({
      firstName: '', lastName: '', email: '', phone: '', address: '', password: '', accountType: 'cliente',
    });
    this.showToast('Sesión iniciada');
    if (this.publishAfterAuthentication) {
      this.publishAfterAuthentication = false;
      this.openPublishForm();
    }
  }

  private publishAfterAuthentication = false;

  private failAuthentication(error: HttpErrorResponse): void {
    this.isAuthenticating = false;
    this.authError = error.status === 409
      ? 'Ya existe una cuenta con ese email. Inicia sesión.'
      : error.status === 401
        ? 'Email o contraseña incorrectos.'
        : 'No se pudo conectar con el servicio de usuarios. Inténtalo de nuevo.';
  }

  closeProfilePanel(): void {
    this.profilePanelOpen = false;
  }

  openListingDetail(listing: ListingCardData): void {
    this.expandedListing = { ...listing };
    this.proposalError = null;
    this.showProposalForm = false;
  }

  closeListingDetail(): void {
    this.expandedListing = null;
    this.showProposalForm = false;
    this.proposalError = null;
  }

  viewMore(listing: ListingCardData): void {
    this.openListingDetail(listing);
  }

  get clientProfile(): ClientProfile {
    return this.profileSummary;
  }
}
