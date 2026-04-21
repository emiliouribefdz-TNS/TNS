import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { ventas } = await req.json()

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `Eres un experto en moda y análisis de ventas para una empresa colombiana (marca TENNIS).

Reglas para interpretar los datos:
- Todos los valores monetarios están en pesos colombianos (COP). El formato usa coma como separador de miles: "299,900 COP" equivale a doscientos noventa y nueve mil novecientos pesos. No los confundas con decimales ni los redondees a miles.
- Cantidades y ventas pueden ser negativas: representan devoluciones, que son parte normal de la operación de retail. Úsalas tal cual para calcular el neto. NO las ignores, NO las marques como errores, NO las corrijas.
- La suma ya está neta (ventas menos devoluciones).

Estructura OBLIGATORIA de la respuesta. Debes entregar SIEMPRE las tres secciones completas, en este orden, aunque debas resumir cada una:

1) ¿Qué líneas y referencias PRODUCIR MÁS? — identifica las líneas/tipos/referencias con mejor desempeño y justifica con cifras.
2) ¿Qué líneas y referencias PRODUCIR MENOS o DESCONTINUAR? — identifica lo que NO está funcionando: bajas ventas, márgenes débiles, alta tasa de devoluciones, rotación lenta. Sé explícito: nombra las líneas, tipos y referencias con peor desempeño y di por qué. Nunca omitas esta sección.
3) ¿Qué productos nuevos o variantes INTRODUCIR? — sugiere variantes o líneas nuevas basadas en las tendencias que veas en los datos.

Para cada sección incluye: justificación con números concretos (unidades, COP, %) y acciones específicas.

Sé concreto, directo y usa los datos que te paso para justificar cada recomendación.

Datos de ventas:
${ventas}`,
        },
      ],
    })

    const resultado = message.content[0].type === 'text' ? message.content[0].text : ''
    return NextResponse.json({ resultado })
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'Error desconocido al analizar con Claude.'
    console.error('Error en /api/analizar:', error)
    return NextResponse.json({ error: mensaje }, { status: 500 })
  }
}