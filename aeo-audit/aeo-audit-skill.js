#!/usr/bin/env node

/**
 * AEO Audit Skill - Agentic Engine Optimization Auditor
 * Audita documentación completa según el AEO Stack
 *
 * 6 capas auditadas:
 * 1. Access Control (robots.txt)
 * 2. Discovery (llms.txt)
 * 3. Capability Signaling (skill.md)
 * 4. Content Formatting
 * 5. Token Surfacing
 * 6. UX Bridge (Copy for AI)
 */

const fs = require('fs');
const https = require('https');
const http = require('http');
const url = require('url');

class AEOAuditSkill {
  constructor(input) {
    this.input = input;
    this.content = '';
    this.domain = '';
    this.issues = [];
    this.checks = {};
    this.layers = {
      accessControl: { passed: false, issues: [] },
      discovery: { passed: false, issues: [] },
      capabilitySignaling: { passed: false, issues: [] },
      contentFormatting: { passed: false, issues: [] },
      tokenSurfacing: { passed: false, issues: [] },
      uxBridge: { passed: false, issues: [] }
    };
  }

  estimateTokens(text = this.content) {
    return Math.round(text.length / 4);
  }

  // ==================== CAPA 1: ACCESS CONTROL ====================
  async auditAccessControl() {
    console.log('\n🔐 Auditando: Access Control (robots.txt)...');

    const layer = this.layers.accessControl;

    if (!this.domain) {
      layer.issues.push('No se pudo determinar el dominio');
      return;
    }

    try {
      const robotsUrl = `${this.domain}/robots.txt`;
      const robotsContent = await this.fetchUrl(robotsUrl);

      if (!robotsContent) {
        layer.issues.push('❌ robots.txt no encontrado');
        return;
      }

      // Verificar si bloquea agentes conocidos
      const blockingPatterns = [
        { agent: 'Claude/Anthropic', pattern: /User-agent:\s*\*[\s\S]*?Disallow:.*?\/.*?(?:claude|anthropic)/i },
        { agent: 'OpenAI', pattern: /User-agent:\s*\*[\s\S]*?Disallow:.*?(?:gpt|openai)/i },
        { agent: 'All agents', pattern: /User-agent:\s*\*[\s\S]*?Disallow:\s*\// }
      ];

      let hasBlockers = false;
      blockingPatterns.forEach(({ agent, pattern }) => {
        if (pattern.test(robotsContent)) {
          layer.issues.push(`⚠️ robots.txt podría estar bloqueando a ${agent}`);
          hasBlockers = true;
        }
      });

      if (!hasBlockers) {
        layer.passed = true;
        this.checks['access_control'] = true;
      } else {
        this.checks['access_control'] = false;
      }
    } catch (error) {
      layer.issues.push(`⚠️ No se pudo verificar robots.txt: ${error.message}`);
      this.checks['access_control'] = false;
    }
  }

  // ==================== CAPA 2: DISCOVERY ====================
  async auditDiscovery() {
    console.log('🔍 Auditando: Discovery (llms.txt, agent-permissions.json, AGENTS.md)...');

    const layer = this.layers.discovery;

    if (!this.domain) {
      layer.issues.push('No se pudo determinar el dominio');
      return;
    }

    // Verificar llms.txt
    try {
      const llmsTxt = await this.fetchUrl(`${this.domain}/llms.txt`);
      if (llmsTxt && llmsTxt.length > 100) {
        layer.issues.push('✅ llms.txt encontrado y activo');
        const llmsTokens = this.estimateTokens(llmsTxt);
        if (llmsTokens > 5000) {
          layer.issues.push(`⚠️ llms.txt es muy grande (${llmsTokens} tokens, target: <5000)`);
        }
      } else {
        layer.issues.push('❌ llms.txt no encontrado o vacío');
      }
    } catch {
      layer.issues.push('⚠️ llms.txt no accesible');
    }

    // Verificar agent-permissions.json
    try {
      const agentPerms = await this.fetchUrl(`${this.domain}/agent-permissions.json`);
      if (agentPerms && agentPerms.length > 10) {
        layer.issues.push('✅ agent-permissions.json encontrado');
      } else {
        layer.issues.push('⚠️ agent-permissions.json no configurado (considera agregarlo)');
      }
    } catch {
      layer.issues.push('⚠️ agent-permissions.json no encontrado');
    }

    // Verificar AGENTS.md en repositorio (info)
    layer.issues.push('ℹ️ Verificar que exista AGENTS.md en raíz del repo');

    layer.passed = layer.issues.filter(i => i.startsWith('✅')).length > 0;
    this.checks['discovery'] = layer.passed;
  }

  // ==================== CAPA 3: CAPABILITY SIGNALING ====================
  auditCapabilitySignaling() {
    console.log('⚡ Auditando: Capability Signaling (skill.md)...');

    const layer = this.layers.capabilitySignaling;

    // Verificar si el contenido tiene definición de capacidades
    const hasCapabilities = /capabilities|can accomplish|what i can|qué puede/i.test(this.content);
    const hasInputs = /required inputs|inputs|parámetros|arguments|options/i.test(this.content);
    const hasConstraints = /constraints|limitations|rate limit|máximo|límite/i.test(this.content);
    const hasDocLinks = /documentation|docs|guía|guide|reference/i.test(this.content);

    if (hasCapabilities) layer.issues.push('✅ Sección de capacidades detectada');
    else layer.issues.push('❌ Falta definir las capacidades (qué hace este servicio)');

    if (hasInputs) layer.issues.push('✅ Inputs/parámetros documentados');
    else layer.issues.push('❌ Falta documentar inputs requeridos');

    if (hasConstraints) layer.issues.push('✅ Constraints definidos');
    else layer.issues.push('⚠️ Considera documentar rate limits y constraints');

    if (hasDocLinks) layer.issues.push('✅ Links a documentación incluidos');
    else layer.issues.push('⚠️ Falta linkar a documentación detallada');

    layer.passed = [hasCapabilities, hasInputs, hasConstraints, hasDocLinks].filter(Boolean).length >= 3;
    this.checks['capability_signaling'] = layer.passed;
  }

  // ==================== CAPA 4: CONTENT FORMATTING ====================
  auditContentFormatting() {
    console.log('📝 Auditando: Content Formatting...');

    const layer = this.layers.contentFormatting;
    const formatting = {};

    // Markdown format
    const isMarkdown = /^#+ /.test(this.content) || /```/.test(this.content);
    formatting.markdown = isMarkdown;
    if (isMarkdown) layer.issues.push('✅ Formato Markdown detectado');
    else layer.issues.push('❌ No parece ser Markdown puro (necesario para agentes)');

    // Heading hierarchy
    const headings = this.content.match(/^(#{1,6})\s/gm) || [];
    let validHierarchy = true;
    if (headings.length > 0) {
      const levels = headings.map(h => h.match(/^#+/)[0].length);
      for (let i = 1; i < levels.length; i++) {
        if (levels[i] > levels[i - 1] + 1) {
          validHierarchy = false;
          break;
        }
      }
    }
    formatting.headingHierarchy = validHierarchy;
    if (validHierarchy) layer.issues.push('✅ Jerarquía de headings correcta');
    else layer.issues.push('❌ Saltos en la jerarquía de headings (usa H1→H2→H3)');

    // Outcome first (primeras 200 palabras)
    const words = this.content.split(/\s+/).slice(0, 200).join(' ');
    const outcomePatterns = [
      /(\bes\b|\bqué\b|\bpropósito\b)/i,
      /(\bpuede|\bhace|\bacciones|\bcapacidades\b)/i,
      /(\bempezar|\bcomenzar|\binstalar|\bconfigurar\b)/i
    ];
    const outcomeFound = outcomePatterns.filter(p => p.test(words)).length >= 2;
    formatting.outcomeFirst = outcomeFound;
    if (outcomeFound) layer.issues.push('✅ Primeras 200 palabras establecen: qué, qué hace, cómo empezar');
    else layer.issues.push('⚠️ Primeros 200 palabras no claros - agrega: qué es, qué hace, cómo empezar');

    // Code examples proximity
    const codeBlocks = (this.content.match(/```[\s\S]*?```/g) || []).length;
    let goodProximity = 0;
    if (codeBlocks > 0) {
      const codePattern = /(.{0,200})\n```/g;
      let match;
      while ((match = codePattern.exec(this.content)) !== null) {
        if (/ejemplo|ilustr|código|implementa|muestra|demuestra|así/i.test(match[1])) {
          goodProximity++;
        }
      }
    }
    const codeProximityRatio = codeBlocks > 0 ? goodProximity / codeBlocks : 1;
    formatting.codeProximity = codeProximityRatio >= 0.6;
    if (formatting.codeProximity) layer.issues.push('✅ Ejemplos de código bien contextualizados');
    else if (codeBlocks > 0) layer.issues.push(`⚠️ ${Math.round(codeProximityRatio * 100)}% de ejemplos bien contextualizados (target: >70%)`);

    // Tables vs prose for parameters
    const paramMentions = (this.content.match(/parámetro|opción|argumento|campo|parameter|option|argument/gi) || []).length;
    const tables = (this.content.match(/\|.*\|/g) || []).length;
    formatting.tablesForParams = tables > 0 || paramMentions < 5;
    if (formatting.tablesForParams) layer.issues.push('✅ Parámetros documentados en tablas o estructura clara');
    else layer.issues.push(`⚠️ ${paramMentions} referencias a parámetros en prosa - considera usar tablas`);

    // Paragraph length (scanability)
    const paragraphs = this.content.split('\n\n').filter(p => p.trim().length > 50);
    const longParagraphs = paragraphs.filter(p => p.split(/\s+/).length > 300).length;
    formatting.scanability = longParagraphs === 0;
    if (formatting.scanability) layer.issues.push('✅ Párrafos cortos y escaneables');
    else layer.issues.push(`⚠️ ${longParagraphs} párrafos muy largos (>300 palabras) - divide para escaneabilidad`);

    // No JavaScript
    const hasJS = /<script>|onclick=|fetch\(|addEventListener|React\.|Vue\./i.test(this.content);
    formatting.noJavaScript = !hasJS;
    if (formatting.noJavaScript) layer.issues.push('✅ Sin dependencias de JavaScript');
    else layer.issues.push('❌ Contiene patrones de JavaScript - agentes no pueden ejecutar');

    // Links formatting
    const badLinks = (this.content.match(/click\s+(aquí|here|this|link)/gi) || []).length;
    formatting.properLinks = badLinks === 0;
    if (formatting.properLinks) layer.issues.push('✅ Links con formato correcto [descripción](url)');
    else layer.issues.push(`❌ ${badLinks} links con "click aquí" - usa [descripción](url)`);

    layer.passed = Object.values(formatting).filter(Boolean).length >= 5;
    this.checks['content_formatting'] = layer.passed;
  }

  // ==================== CAPA 5: TOKEN SURFACING ====================
  auditTokenSurfacing() {
    console.log('🔢 Auditando: Token Surfacing...');

    const layer = this.layers.tokenSurfacing;
    const tokens = this.estimateTokens();

    // Token count check
    if (tokens < 15000) {
      layer.issues.push(`✅ Excelente: ${tokens.toLocaleString()} tokens (muy eficiente)`);
      this.checks['token_count'] = true;
    } else if (tokens < 30000) {
      layer.issues.push(`✅ Bueno: ${tokens.toLocaleString()} tokens (dentro de límite recomendado)`);
      this.checks['token_count'] = true;
    } else if (tokens < 50000) {
      layer.issues.push(`⚠️ Grande: ${tokens.toLocaleString()} tokens - considera dividir`);
      this.checks['token_count'] = false;
    } else {
      layer.issues.push(`❌ MUY GRANDE: ${tokens.toLocaleString()} tokens - debe dividirse en múltiples páginas`);
      this.checks['token_count'] = false;
    }

    // Verificar si hay metadata de tokens
    const hasTokenMetadata = /tokens?|token count|total tokens/i.test(this.content);
    if (hasTokenMetadata) {
      layer.issues.push('✅ Token count incluido en página');
    } else {
      layer.issues.push('⚠️ Considera exponer token count como metadata (meta tag o header HTTP)');
    }

    layer.passed = this.checks['token_count'];
  }

  // ==================== CAPA 6: UX BRIDGE ====================
  auditUXBridge() {
    console.log('🖱️ Auditando: UX Bridge (Copy for AI, etc)...');

    const layer = this.layers.uxBridge;

    // Verificar acceso a Markdown limpio
    const hasMarkdownAccess = /\.md|markdown|raw|text\/plain/i.test(this.content);
    if (hasMarkdownAccess) {
      layer.issues.push('✅ Acceso a Markdown detectado');
    } else {
      layer.issues.push('⚠️ Considera exponer Markdown limpio (appending .md o query param)');
    }

    // Copy for AI button
    const hasCopyForAI = /copy.*ai|copy.*agent|agent.*copy|clipboard/i.test(this.content);
    if (hasCopyForAI) {
      layer.issues.push('✅ "Copy for AI" implementado');
    } else {
      layer.issues.push('💡 Considera agregar botón "Copy for AI" en documentación');
    }

    // Navigation noise check
    const hasNav = /nav|sidebar|breadcrumb|footer|header/i.test(this.content);
    if (!hasNav) {
      layer.issues.push('✅ Contenido limpio sin ruido de navegación');
    } else {
      layer.issues.push('⚠️ Considera remover nav/sidebar/footer del contenido para agentes');
    }

    layer.passed = true; // UX bridge es complementario, no bloqueante
    this.checks['ux_bridge'] = true;
  }

  // ==================== UTILIDADES ====================
  async fetchUrl(targetUrl) {
    return new Promise((resolve, reject) => {
      const protocol = targetUrl.startsWith('https') ? https : http;
      const parsedUrl = new url.URL(targetUrl);

      const options = {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        timeout: 10000,
        headers: {
          'User-Agent': 'AEOAudit/1.0 (Agent Optimization Auditor)'
        }
      };

      const req = protocol.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      });

      req.on('error', () => resolve(null));
      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });
      req.end();
    });
  }

  async fetchContent(input) {
    return new Promise((resolve, reject) => {
      if (input.startsWith('http://') || input.startsWith('https://')) {
        // Extraer dominio
        try {
          const parsedUrl = new url.URL(input);
          this.domain = `${parsedUrl.protocol}//${parsedUrl.host}`;
        } catch {
          this.domain = null;
        }

        const protocol = input.startsWith('https') ? https : http;
        const parsedUrl = new url.URL(input);

        const options = {
          hostname: parsedUrl.hostname,
          path: parsedUrl.pathname + parsedUrl.search,
          method: 'GET',
          timeout: 15000,
          headers: {
            'User-Agent': 'AEOAudit/1.0'
          }
        };

        const req = protocol.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            // Simple HTML to text conversion
            data = data
              .replace(/<script[\s\S]*?<\/script>/gi, '')
              .replace(/<style[\s\S]*?<\/style>/gi, '')
              .replace(/<nav[\s\S]*?<\/nav>/gi, '')
              .replace(/<footer[\s\S]*?<\/footer>/gi, '')
              .replace(/<[^>]+>/g, '\n')
              .replace(/\n+/g, '\n')
              .trim();
            resolve(data);
          });
        });

        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Request timeout'));
        });
        req.end();
      } else if (fs.existsSync(input)) {
        fs.readFile(input, 'utf-8', (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      } else {
        reject(new Error(`Invalid input: ${input} (not a URL or file)`));
      }
    });
  }

  async runCompleteAudit() {
    try {
      console.log(`\n🚀 AEO Audit Completo: ${this.input}\n`);
      this.content = await this.fetchContent(this.input);

      if (!this.content || this.content.trim().length === 0) {
        console.error('❌ Error: No se encontró contenido');
        return null;
      }

      // Ejecutar todas las auditorías
      await this.auditAccessControl();
      await this.auditDiscovery();
      this.auditCapabilitySignaling();
      this.auditContentFormatting();
      this.auditTokenSurfacing();
      this.auditUXBridge();

      return this.generateReport();
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      return null;
    }
  }

  generateReport() {
    const layerScores = Object.entries(this.layers).map(([name, layer]) => ({
      name,
      passed: layer.passed,
      issues: layer.issues
    }));

    const passedLayers = layerScores.filter(l => l.passed).length;
    const totalLayers = layerScores.length;
    const overallScore = Math.round((passedLayers / totalLayers) * 100);

    let report = `# 📋 AEO Audit Completo\n\n`;
    report += `**Score General:** ${overallScore}% (${passedLayers}/${totalLayers} capas optimizadas)\n`;
    report += `**Tokens:** ${this.estimateTokens().toLocaleString()} / 25,000 (recomendado)\n`;
    report += `**Caracteres:** ${this.content.length.toLocaleString()}\n\n`;

    // Interpretación
    if (overallScore >= 86) {
      report += `### 🟢 Agent-Ready!\nTu contenido está totalmente optimizado para agentes de IA.\n\n`;
    } else if (overallScore >= 67) {
      report += `### 🟡 Good (Minor Gaps)\nTu contenido es generalmente bueno pero tiene algunos gaps.\n\n`;
    } else if (overallScore >= 48) {
      report += `### 🟠 Needs Work\nTu contenido tiene fricciones que agentes notan.\n\n`;
    } else {
      report += `### 🔴 Poor\nTu contenido no está optimizado para agentes.\n\n`;
    }

    // Resultados por capa
    report += `---\n\n## 📊 Resultados por Capa\n\n`;
    layerScores.forEach(layer => {
      const status = layer.passed ? '✅' : '❌';
      report += `### ${status} ${this.formatLayerName(layer.name)}\n`;
      layer.issues.forEach(issue => {
        report += `${issue}\n`;
      });
      report += '\n';
    });

    // Issues y recomendaciones
    report += `---\n\n## 🎯 Tareas de Optimización Prioritarias\n\n`;
    const failedLayers = layerScores.filter(l => !l.passed);
    if (failedLayers.length === 0) {
      report += `🎉 **No hay tareas - tu contenido está totalmente optimizado.**\n`;
    } else {
      failedLayers.slice(0, 5).forEach((layer, idx) => {
        report += `**${idx + 1}. ${this.formatLayerName(layer.name)}**\n`;
        layer.issues.filter(i => i.startsWith('❌') || i.startsWith('⚠️')).forEach(issue => {
          report += `   ${issue}\n`;
        });
        report += '\n';
      });
    }

    return report;
  }

  formatLayerName(layerKey) {
    const names = {
      accessControl: 'Access Control (robots.txt)',
      discovery: 'Discovery (llms.txt, agent-permissions.json)',
      capabilitySignaling: 'Capability Signaling (skill.md)',
      contentFormatting: 'Content Formatting',
      tokenSurfacing: 'Token Surfacing',
      uxBridge: 'UX Bridge (Copy for AI)'
    };
    return names[layerKey] || layerKey;
  }
}

// Main CLI
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
🚀 AEO Audit - Agentic Engine Optimization Auditor
=====================================================

Audita documentación completa según el AEO Stack (6 capas)

Usage:
  /aeo-audit "https://example.com/page"    # URL
  /aeo-audit "/path/to/file.md"            # Local file
  /aeo-audit --help                        # Show this help

6 Capas Auditadas:
1. 🔐 Access Control (robots.txt)
2. 🔍 Discovery (llms.txt, agent-permissions.json)
3. ⚡ Capability Signaling (skill.md)
4. 📝 Content Formatting
5. 🔢 Token Surfacing
6. 🖱️ UX Bridge (Copy for AI)

Examples:
  /aeo-audit "https://loginser.es/docs/api"
  /aeo-audit "./README.md"
    `);
    process.exit(0);
  }

  const input = args[0].replace(/^["']|["']$/g, '');
  const auditor = new AEOAuditSkill(input);
  const report = await auditor.runCompleteAudit();

  if (report) {
    console.log(report);
  }
}

main();
module.exports = AEOAuditSkill;
