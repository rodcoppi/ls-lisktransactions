import { NextResponse } from 'next/server';
import { createLiskCounterAPIDocumentation } from '@/lib/export/api-docs';

export async function GET() {
  try {
    const generator = createLiskCounterAPIDocumentation();
    const yamlDoc = generator.generateYAML();
    
    return new NextResponse(yamlDoc, {
      headers: {
        'Content-Type': 'application/x-yaml',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Failed to generate OpenAPI YAML documentation:', error);
    return NextResponse.json(
      { error: 'Failed to generate API documentation' },
      { status: 500 }
    );
  }
}