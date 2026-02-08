import { NextResponse } from 'next/server';
import { findCopilotBinary, getCopilotVersion } from '@/lib/platform';

export async function GET() {
  try {
    const copilotPath = findCopilotBinary();
    if (!copilotPath) {
      return NextResponse.json({ connected: false, version: null });
    }
    const version = await getCopilotVersion(copilotPath);
    return NextResponse.json({ connected: !!version, version });
  } catch {
    return NextResponse.json({ connected: false, version: null });
  }
}
