import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { ventas } = await req.json()

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Eres un experto en moda y análisis de ventas. Analiza estas ventas de una empresa de moda colombiana y dame recomendaciones específicas sobre: 1) Qué prendas producir más, 2) Qué prendas reducir o descontinuar, 3) Qué prendas nuevas incluir basándote en tendencias actuales. Sé concreto y directo.\n\nVentas:\n${ventas}`,
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