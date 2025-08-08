import { NextResponse } from 'next/server';
import { createLiskCounterAPIDocumentation } from '@/lib/export/api-docs';

export async function GET() {
  try {
    const generator = createLiskCounterAPIDocumentation();
    const openApiDoc = generator.generateOpenAPI();
    
    return NextResponse.json(openApiDoc, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Failed to generate OpenAPI documentation:', error);
    return NextResponse.json(
      { error: 'Failed to generate API documentation' },
      { status: 500 }
    );
  }
}