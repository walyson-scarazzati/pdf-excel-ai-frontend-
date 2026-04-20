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
        <h1>Extrair dados de PDF para Excel com apoio de IA</h1>
        <p class="intro">
          Faz upload do PDF, gera uma previsao estruturada e descarrega um ficheiro Excel.
        </p>

        <label class="upload-box">
          <span>Escolher PDF</span>
          <input type="file" accept="application/pdf" (change)="onFileSelected($event)" />
        </label>

        <div class="actions">
          <button type="button" (click)="preview()" [disabled]="!selectedFile() || loading()">Analisar PDF</button>
          <button type="button" class="secondary" (click)="downloadExcel()" [disabled]="!selectedFile() || loading()">Exportar Excel</button>
        </div>

        <p class="status" *ngIf="selectedFile()">Ficheiro: {{ selectedFile()?.name }}</p>
        <p class="status" *ngIf="loading()">A processar o documento...</p>
        <p class="error" *ngIf="errorMessage()">{{ errorMessage() }}</p>
      </section>

      <section class="results-grid" *ngIf="result() as currentResult">
        <article class="panel">
          <h2>Resumo</h2>
          <p><strong>Ficheiro:</strong> {{ currentResult.fileName }}</p>
          <p><strong>Paginas:</strong> {{ currentResult.pageCount }}</p>
          <p><strong>Linhas extraidas:</strong> {{ currentResult.totalRows }}</p>
          <p><strong>IA ativa:</strong> {{ currentResult.aiUsed ? 'Sim' : 'Nao' }}</p>
          <p><strong>Modo:</strong> {{ currentResult.extractionMode }}</p>
        </article>

        <article class="panel">
          <h2>Texto lido do PDF</h2>
          <pre>{{ currentResult.previewText }}</pre>
        </article>

        <article class="panel wide">
          <h2>Linhas estruturadas</h2>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Referencia</th>
                  <th>Descricao</th>
                  <th>Valor</th>
                  <th>Data</th>
                  <th>Notas</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let row of currentResult.rows">
                  <td>{{ row.reference }}</td>
                  <td>{{ row.description }}</td>
                  <td>{{ row.amount }}</td>
                  <td>{{ row.date }}</td>
                  <td>{{ row.notes }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>
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
        this.errorMessage.set('Falha ao analisar o PDF. Confirma se o backend esta a correr.');
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
}