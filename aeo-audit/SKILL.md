---
name: aeo-audit
description: Audita contenido para Agentic Engine Optimization. Genera checklist de optimizaciones para que agentes de IA lean mejor tu documentación.
user-invokable: true
argument-hint: "[archivo.md|https://url]"
license: MIT
metadata:
  author: Loginser Team
  version: "1.0.0"
  category: aeo
---

# AEO Audit Skill

Audita contenido/documentación para Agentic Engine Optimization (AEO). Verifica que tu contenido esté optimizado para ser leído y procesado por agentes de IA.

## Uso

```
/aeo-audit "./docs/archivo.md"
/aeo-audit "https://ejemplo.com/pagina"
```

## Qué verifica

- **Markdown Format**: Verificar que sea Markdown puro sin HTML
- **Primeros 200 palabras**: Que establezcan claramente qué es, qué hace, cómo empezar
- **Jerarquía de headings**: Sin saltos entre niveles
- **Sin JavaScript**: Contenido debe ser puro, sin dependencias de JS
- **Outcome First**: Secciones comienzan con el resultado, no con background
- **Proximidad de código**: Ejemplos estén justo después de su descripción
- **Links correctos**: Usa `[descripción](url)` en lugar de "click aquí"
- **Tablas para parámetros**: Información de parámetros en tablas (más eficiente)
- **Escaneabilidad**: Párrafos cortos (<300 palabras)
- **Token Count**: Contenido optimizado (<25,000 tokens)

## Output

Genera un checklist con:
- **AEO Score** (0-100%)
- **Checks pasados vs fallidos**
- **Issues encontrados**
- **Top 5 tareas de optimización** con estimaciones de esfuerzo

## Ejemplo

```
/aeo-audit "./README.md"
```

Retorna:
- 🟢 Green (86%+): Agent-Ready
- 🟡 Yellow (67-85%): Good (minor gaps)
- 🟠 Orange (48-66%): Needs Work
- 🔴 Red (<48%): Poor
