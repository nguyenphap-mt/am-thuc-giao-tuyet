# Angular Linear Components Template

Các component Angular được thiết kế theo phong cách Linear.app cho AI Workforce.

## Cấu Trúc Thư Mục

```
frontend/src/app/shared/
├── components/
│   ├── command-palette/
│   │   ├── command-palette.component.ts
│   │   ├── command-palette.component.html
│   │   ├── command-palette.component.scss
│   │   └── command-palette.service.ts
│   ├── skeleton-loader/
│   │   └── skeleton-loader.component.ts
│   ├── toast/
│   │   ├── toast.component.ts
│   │   └── toast.service.ts
│   ├── context-menu/
│   │   └── context-menu.component.ts
│   └── drawer/
│       └── drawer.component.ts
└── lib/
    └── animations/
        └── motion-presets.ts
```

---

## 1. Command Palette (Cmd+K)

### Service
```typescript
// command-palette.service.ts
import { Injectable, signal } from '@angular/core';

export interface Command {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  category: 'navigation' | 'action' | 'search' | 'settings';
  action: () => void;
}

@Injectable({ providedIn: 'root' })
export class CommandPaletteService {
  isOpen = signal(false);
  searchQuery = signal('');
  commands = signal<Command[]>([]);
  
  open(): void {
    this.isOpen.set(true);
    this.searchQuery.set('');
  }
  
  close(): void {
    this.isOpen.set(false);
  }
  
  toggle(): void {
    this.isOpen.update(v => !v);
  }
  
  registerCommands(commands: Command[]): void {
    this.commands.update(existing => [...existing, ...commands]);
  }
  
  executeCommand(command: Command): void {
    command.action();
    this.close();
  }
  
  filteredCommands(): Command[] {
    const query = this.searchQuery().toLowerCase();
    if (!query) return this.commands();
    return this.commands().filter(c => 
      c.label.toLowerCase().includes(query)
    );
  }
}
```

### Component
```typescript
// command-palette.component.ts
import { Component, HostListener, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommandPaletteService, Command } from './command-palette.service';
import { fadeIn, scaleIn } from '@shared/lib/animations/motion-presets';

@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [CommonModule, FormsModule],
  animations: [fadeIn, scaleIn],
  template: `
    @if (cmdService.isOpen()) {
      <div class="overlay" @fadeIn (click)="cmdService.close()">
        <div class="palette" @scaleIn (click)="$event.stopPropagation()">
          <div class="search-container">
            <input
              type="text"
              placeholder="Type a command or search..."
              [ngModel]="cmdService.searchQuery()"
              (ngModelChange)="cmdService.searchQuery.set($event)"
              (keydown)="onKeyDown($event)"
              #searchInput
            />
          </div>
          
          <div class="results">
            @for (command of filteredCommands(); track command.id; let i = $index) {
              <div 
                class="result-item"
                [class.selected]="i === selectedIndex()"
                (click)="execute(command)"
                (mouseenter)="selectedIndex.set(i)"
              >
                <span class="icon">{{ command.icon }}</span>
                <span class="label">{{ command.label }}</span>
                @if (command.shortcut) {
                  <span class="shortcut">{{ command.shortcut }}</span>
                }
              </div>
            }
            
            @if (filteredCommands().length === 0) {
              <div class="no-results">No results found</div>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      padding-top: 20vh;
      z-index: 9999;
    }
    
    .palette {
      width: 560px;
      max-height: 400px;
      background: var(--bg-secondary, #141414);
      border: 1px solid var(--border-color, #2a2a2a);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 16px 70px rgba(0, 0, 0, 0.5);
    }
    
    .search-container {
      padding: 16px;
      border-bottom: 1px solid var(--border-color, #2a2a2a);
    }
    
    input {
      width: 100%;
      background: transparent;
      border: none;
      outline: none;
      font-size: 16px;
      color: var(--text-primary, #fff);
    }
    
    .results {
      max-height: 320px;
      overflow-y: auto;
    }
    
    .result-item {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      cursor: pointer;
      transition: background 100ms ease;
      
      &.selected, &:hover {
        background: var(--bg-tertiary, #1f1f1f);
      }
    }
    
    .icon {
      width: 24px;
      margin-right: 12px;
    }
    
    .label {
      flex: 1;
      color: var(--text-primary, #fff);
    }
    
    .shortcut {
      font-size: 12px;
      color: var(--text-secondary, #a1a1a1);
      background: var(--bg-primary, #0a0a0a);
      padding: 4px 8px;
      border-radius: 4px;
    }
    
    .no-results {
      padding: 24px;
      text-align: center;
      color: var(--text-secondary, #a1a1a1);
    }
  `]
})
export class CommandPaletteComponent {
  cmdService = inject(CommandPaletteService);
  selectedIndex = signal(0);
  
  filteredCommands = computed(() => this.cmdService.filteredCommands());
  
  @HostListener('document:keydown', ['$event'])
  handleGlobalKeyDown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      this.cmdService.toggle();
    }
    
    if (event.key === 'Escape' && this.cmdService.isOpen()) {
      this.cmdService.close();
    }
  }
  
  onKeyDown(event: KeyboardEvent): void {
    const commands = this.filteredCommands();
    
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.selectedIndex.update(i => Math.min(i + 1, commands.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.selectedIndex.update(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        event.preventDefault();
        if (commands[this.selectedIndex()]) {
          this.execute(commands[this.selectedIndex()]);
        }
        break;
    }
  }
  
  execute(command: Command): void {
    this.cmdService.executeCommand(command);
  }
}
```

---

## 2. Skeleton Loader

```typescript
// skeleton-loader.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="skeleton"
      [style.width]="width"
      [style.height]="height"
      [class.circle]="variant === 'circle'"
      [class.text]="variant === 'text'"
    ></div>
  `,
  styles: [`
    .skeleton {
      background: linear-gradient(
        90deg,
        var(--bg-secondary, #141414) 0%,
        var(--bg-tertiary, #1f1f1f) 50%,
        var(--bg-secondary, #141414) 100%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 4px;
    }
    
    .circle {
      border-radius: 50%;
    }
    
    .text {
      height: 1em;
      margin: 0.25em 0;
    }
    
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `]
})
export class SkeletonLoaderComponent {
  @Input() width = '100%';
  @Input() height = '20px';
  @Input() variant: 'rect' | 'circle' | 'text' = 'rect';
}
```

---

## 3. Toast Notifications

### Service
```typescript
// toast.service.ts
import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts = signal<Toast[]>([]);
  
  show(message: string, type: Toast['type'] = 'info', duration = 4000): void {
    const toast: Toast = {
      id: crypto.randomUUID(),
      message,
      type,
      duration
    };
    
    this.toasts.update(t => [...t, toast]);
    
    if (duration > 0) {
      setTimeout(() => this.dismiss(toast.id), duration);
    }
  }
  
  success(message: string): void {
    this.show(message, 'success');
  }
  
  error(message: string): void {
    this.show(message, 'error');
  }
  
  warning(message: string): void {
    this.show(message, 'warning');
  }
  
  dismiss(id: string): void {
    this.toasts.update(t => t.filter(toast => toast.id !== id));
  }
}
```

### Component
```typescript
// toast.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from './toast.service';
import { slideUp } from '@shared/lib/animations/motion-presets';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  animations: [slideUp],
  template: `
    <div class="toast-container">
      @for (toast of toastService.toasts(); track toast.id) {
        <div 
          class="toast"
          [class]="'toast-' + toast.type"
          @slideUp
          (click)="toastService.dismiss(toast.id)"
        >
          <span class="icon">{{ getIcon(toast.type) }}</span>
          <span class="message">{{ toast.message }}</span>
          <button class="close">×</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .toast {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: var(--bg-secondary, #141414);
      border: 1px solid var(--border-color, #2a2a2a);
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      cursor: pointer;
      min-width: 300px;
    }
    
    .toast-success { border-left: 3px solid var(--success, #4ade80); }
    .toast-error { border-left: 3px solid var(--error, #f87171); }
    .toast-warning { border-left: 3px solid var(--warning, #facc15); }
    .toast-info { border-left: 3px solid var(--accent, #5e6ad2); }
    
    .message {
      flex: 1;
      color: var(--text-primary, #fff);
    }
    
    .close {
      background: none;
      border: none;
      color: var(--text-secondary, #a1a1a1);
      font-size: 18px;
      cursor: pointer;
    }
  `]
})
export class ToastContainerComponent {
  toastService = inject(ToastService);
  
  getIcon(type: string): string {
    const icons: Record<string, string> = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    return icons[type] || '';
  }
}
```

---

## 4. Context Menu

```typescript
// context-menu.component.ts
import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { scaleIn } from '@shared/lib/animations/motion-presets';

export interface MenuItem {
  label: string;
  icon?: string;
  shortcut?: string;
  action?: () => void;
  disabled?: boolean;
  divider?: boolean;
}

@Component({
  selector: 'app-context-menu',
  standalone: true,
  imports: [CommonModule],
  animations: [scaleIn],
  template: `
    @if (isOpen) {
      <div 
        class="menu"
        [style.left.px]="x"
        [style.top.px]="y"
        @scaleIn
      >
        @for (item of items; track item.label) {
          @if (item.divider) {
            <div class="divider"></div>
          } @else {
            <button 
              class="menu-item"
              [disabled]="item.disabled"
              (click)="onItemClick(item)"
            >
              @if (item.icon) {
                <span class="icon">{{ item.icon }}</span>
              }
              <span class="label">{{ item.label }}</span>
              @if (item.shortcut) {
                <span class="shortcut">{{ item.shortcut }}</span>
              }
            </button>
          }
        }
      </div>
    }
  `,
  styles: [`
    .menu {
      position: fixed;
      min-width: 180px;
      background: var(--bg-secondary, #141414);
      border: 1px solid var(--border-color, #2a2a2a);
      border-radius: 8px;
      padding: 4px;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
      z-index: 9999;
    }
    
    .menu-item {
      display: flex;
      align-items: center;
      width: 100%;
      padding: 8px 12px;
      background: none;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: background 100ms ease;
      
      &:hover:not(:disabled) {
        background: var(--bg-tertiary, #1f1f1f);
      }
      
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
    
    .icon {
      width: 20px;
      margin-right: 8px;
    }
    
    .label {
      flex: 1;
      text-align: left;
      color: var(--text-primary, #fff);
    }
    
    .shortcut {
      font-size: 11px;
      color: var(--text-secondary, #a1a1a1);
    }
    
    .divider {
      height: 1px;
      background: var(--border-color, #2a2a2a);
      margin: 4px 0;
    }
  `]
})
export class ContextMenuComponent {
  @Input() items: MenuItem[] = [];
  @Input() x = 0;
  @Input() y = 0;
  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();
  
  @HostListener('document:click')
  @HostListener('document:keydown.escape')
  close(): void {
    this.isOpen = false;
    this.closed.emit();
  }
  
  onItemClick(item: MenuItem): void {
    if (item.action && !item.disabled) {
      item.action();
    }
    this.close();
  }
}
```

---

## 5. Motion Presets (Complete)

```typescript
// lib/animations/motion-presets.ts
import { 
  trigger, 
  transition, 
  style, 
  animate, 
  query, 
  stagger,
  state,
  AnimationTriggerMetadata
} from '@angular/animations';

// Fade animations
export const fadeIn: AnimationTriggerMetadata = trigger('fadeIn', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate('150ms ease-out', style({ opacity: 1 }))
  ]),
  transition(':leave', [
    animate('100ms ease-in', style({ opacity: 0 }))
  ])
]);

// Slide animations
export const slideUp: AnimationTriggerMetadata = trigger('slideUp', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(8px)' }),
    animate('150ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
  ]),
  transition(':leave', [
    animate('100ms ease-in', style({ opacity: 0, transform: 'translateY(8px)' }))
  ])
]);

export const slideDown: AnimationTriggerMetadata = trigger('slideDown', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(-8px)' }),
    animate('150ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
  ]),
  transition(':leave', [
    animate('100ms ease-in', style({ opacity: 0, transform: 'translateY(-8px)' }))
  ])
]);

export const slideFromRight: AnimationTriggerMetadata = trigger('slideFromRight', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateX(100%)' }),
    animate('200ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
  ]),
  transition(':leave', [
    animate('150ms ease-in', style({ opacity: 0, transform: 'translateX(100%)' }))
  ])
]);

// Scale animations
export const scaleIn: AnimationTriggerMetadata = trigger('scaleIn', [
  transition(':enter', [
    style({ opacity: 0, transform: 'scale(0.95)' }),
    animate('150ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
  ]),
  transition(':leave', [
    animate('100ms ease-in', style({ opacity: 0, transform: 'scale(0.95)' }))
  ])
]);

// Stagger list animation
export const staggerList: AnimationTriggerMetadata = trigger('staggerList', [
  transition('* => *', [
    query(':enter', [
      style({ opacity: 0, transform: 'translateY(10px)' }),
      stagger('50ms', [
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ], { optional: true })
  ])
]);

// Expand/Collapse
export const expandCollapse: AnimationTriggerMetadata = trigger('expandCollapse', [
  state('collapsed', style({ height: '0', overflow: 'hidden' })),
  state('expanded', style({ height: '*', overflow: 'visible' })),
  transition('collapsed <=> expanded', animate('200ms ease-in-out'))
]);

// Rotate
export const rotate: AnimationTriggerMetadata = trigger('rotate', [
  state('default', style({ transform: 'rotate(0)' })),
  state('rotated', style({ transform: 'rotate(180deg)' })),
  transition('default <=> rotated', animate('150ms ease-in-out'))
]);
```

---

## 6. Drawer Component

```typescript
// drawer.component.ts
import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { fadeIn, slideFromRight } from '@shared/lib/animations/motion-presets';

@Component({
  selector: 'app-drawer',
  standalone: true,
  imports: [CommonModule],
  animations: [fadeIn, slideFromRight],
  template: `
    @if (isOpen) {
      <div class="overlay" @fadeIn (click)="close()">
        <div 
          class="drawer"
          [style.width.px]="width"
          @slideFromRight
          (click)="$event.stopPropagation()"
        >
          <div class="drawer-header">
            <h2>{{ title }}</h2>
            <button class="close-btn" (click)="close()">×</button>
          </div>
          <div class="drawer-content">
            <ng-content></ng-content>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1000;
      display: flex;
      justify-content: flex-end;
    }
    
    .drawer {
      height: 100%;
      background: var(--bg-primary, #0a0a0a);
      border-left: 1px solid var(--border-color, #2a2a2a);
      display: flex;
      flex-direction: column;
    }
    
    .drawer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-color, #2a2a2a);
      
      h2 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--text-primary, #fff);
      }
    }
    
    .close-btn {
      background: none;
      border: none;
      color: var(--text-secondary, #a1a1a1);
      font-size: 24px;
      cursor: pointer;
      
      &:hover {
        color: var(--text-primary, #fff);
      }
    }
    
    .drawer-content {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
    }
  `]
})
export class DrawerComponent {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() width = 400;
  @Output() closed = new EventEmitter<void>();
  
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen) {
      this.close();
    }
  }
  
  close(): void {
    this.isOpen = false;
    this.closed.emit();
  }
}
```

---

## Checklist Component Library

| Component | Status | Priority |
| :--- | :---: | :---: |
| Command Palette | ✅ | P0 |
| Skeleton Loader | ✅ | P0 |
| Toast Notifications | ✅ | P0 |
| Context Menu | ✅ | P0 |
| Drawer | ✅ | P1 |
| Motion Presets | ✅ | P0 |
| Modal | ⬜ (sử dụng Angular CDK) | P1 |
| Tooltip | ⬜ (sử dụng Angular CDK) | P2 |
