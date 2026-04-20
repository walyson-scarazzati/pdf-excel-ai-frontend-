import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { DocumentService, ExtractionResult } from './document.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: `
    <main class="page-shell">
      <section class="hero-card">
        <p class="eyebrow">Java + Spring + Angular</p>
        <h1>Extrair dados de PDF para Excel sem perder a referencia visual</h1>
        <p class="intro">
          Faz upload de PDF ou imagem, compara o original com a leitura estruturada e descarrega um ficheiro Excel.
        </p>

        <label class="upload-box">
          <span>Escolher documento</span>
          <input type="file" accept="application/pdf,image/png,image/jpeg,image/webp,image/tiff" (change)="onFileSelected($event)" />
        </label>

        <div class="actions">
          <button type="button" (click)="preview()" [disabled]="!selectedFile() || loading()">Analisar documento</button>
          <button type="button" class="secondary" (click)="downloadExcel()" [disabled]="!selectedFile() || loading()">Exportar Excel</button>
        </div>

        <p class="status" *ngIf="selectedFile()">Ficheiro: {{ selectedFile()?.name }}</p>
        <p class="status" *ngIf="loading()">A processar o documento...</p>
        <p class="error" *ngIf="errorMessage()">{{ errorMessage() }}</p>
      </section>

      <section class="data-section" *ngIf="result() as currentResult">
        <div class="totals-bar">
          <div class="total-item">
            <span>Lançamentos</span>
            <strong>{{ currentResult.totalRows }}</strong>
          </div>
          <div class="total-item total-credit">
            <span>Total Créditos</span>
            <strong>R$ {{ totalByField('credit') }}</strong>
          </div>
          <div class="total-item total-debit">
            <span>Total Débitos</span>
            <strong>R$ {{ totalByField('debit') }}</strong>
          </div>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Data</th>
                <th>Descrição</th>
                <th>Nº Doc</th>
                <th>Crédito (R$)</th>
                <th>Débito (R$)</th>
                <th>Saldo (R$)</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of currentResult.rows; index as rowIndex"
                  [class.row-debit]="row.debit"
                  [class.row-credit]="row.credit && !row.debit">
                <td class="row-index">{{ rowIndex + 1 }}</td>
                <td class="col-date">{{ row.date }}</td>
                <td>{{ row.description }}</td>
                <td class="col-ref">{{ row.docNumber }}</td>
                <td class="col-amount-credit">{{ row.credit }}</td>
                <td class="col-amount-debit">{{ row.debit }}</td>
                <td class="col-balance">{{ row.balance }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  `,
  styleUrl: './app.component.css'
})
export class AppComponent {
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly result = signal<ExtractionResult | null>(null);

  constructor(private readonly documentService: DocumentService) {}

  protected totalByField(field: 'credit' | 'debit'): string {
    const rows = this.result()?.rows ?? [];
    const total = rows
      .map((row) => this.parseAmount(row[field]))
      .reduce((sum, amount) => sum + amount, 0);

    return total.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0) ?? null;
    this.selectedFile.set(file);
    this.result.set(null);
    this.errorMessage.set('');
  }

  protected preview(): void {
    const file = this.selectedFile();
    if (!file) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    this.documentService.preview(file).subscribe({
      next: (response) => {
        this.result.set(response);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Falha ao analisar o documento. Confirma se o backend esta a correr e se o OCR local esta instalado quando precisares dele.');
        this.loading.set(false);
      }
    });
  }

  protected downloadExcel(): void {
    const file = this.selectedFile();
    if (!file) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    this.documentService.export(file).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'dados-extraidos.xlsx';
        anchor.click();
        window.URL.revokeObjectURL(url);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Falha ao gerar o Excel.');
        this.loading.set(false);
      }
    });
  }

  private parseAmount(amount: string): number {
    const normalizedAmount = amount.replace(/[^\d,.-]/g, '');
    if (!normalizedAmount) {
      return 0;
    }

    const lastComma = normalizedAmount.lastIndexOf(',');
    const lastDot = normalizedAmount.lastIndexOf('.');
    let canonicalAmount = normalizedAmount;

    if (lastComma > lastDot) {
      canonicalAmount = normalizedAmount.replace(/\./g, '').replace(',', '.');
    } else if (lastDot > lastComma && (normalizedAmount.match(/\./g)?.length ?? 0) > 1) {
      canonicalAmount = normalizedAmount.replace(/\./g, '');
    } else {
      canonicalAmount = normalizedAmount.replace(/,/g, '');
    }

    const parsed = Number(canonicalAmount);
    return Number.isFinite(parsed) ? Math.abs(parsed) : 0;
  }
}