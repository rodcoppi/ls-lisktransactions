import { NextResponse } from 'next/server';
import { createLiskCounterAPIDocumentation, generateAPIDocumentation } from '@/lib/export/api-docs';

export async function GET() {
  try {
    const { html } = await generateAPIDocumentation();
    
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Failed to generate API documentation HTML:', error);
    return NextResponse.json(
      { error: 'Failed to generate API documentation' },
      { status: 500 }
    );
  }
}