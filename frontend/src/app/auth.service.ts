import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, finalize, of, tap } from 'rxjs';

export type AccountType = 'cliente' | 'profesional' | 'ambos';

export interface UserProfile {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  address: string | null;
  accountType: AccountType;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  password: string;
  accountType: AccountType;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthSession {
  token: string;
  user: UserProfile;
}

const API_URL = 'https://avisa-n4cc.onrender.com/api';
const SESSION_KEY = 'avisa.session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  get token(): string | null {
    return typeof window === 'undefined' ? null : window.sessionStorage.getItem(SESSION_KEY);
  }

  register(payload: RegisterPayload): Observable<AuthSession> {
    return this.http.post<AuthSession>(`${API_URL}/auth/register`, payload)
      .pipe(tap((response) => this.saveToken(response.token)));
  }

  login(payload: LoginPayload): Observable<AuthSession> {
    return this.http.post<AuthSession>(`${API_URL}/auth/login`, payload)
      .pipe(tap((response) => this.saveToken(response.token)));
  }

  restoreSession(): Observable<UserProfile | null> {
    if (!this.token) {
      return of(null);
    }

    return this.http.get<UserProfile>(`${API_URL}/users/me`).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          this.clearToken();
        }
        return of(null);
      }),
    );
  }

  logout(): Observable<void> {
    if (!this.token) {
      this.clearToken();
      return of(void 0);
    }

    return this.http.post<void>(`${API_URL}/auth/logout`, {}).pipe(
      catchError(() => of(void 0)),
      finalize(() => this.clearToken()),
    );
  }

  private saveToken(token: string): void {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(SESSION_KEY, token);
    }
  }

  private clearToken(): void {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(SESSION_KEY);
    }
  }
}

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = inject(AuthService).token;
  if (!token || !request.url.startsWith(API_URL)) {
    return next(request);
  }

  return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
