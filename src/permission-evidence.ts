/** Report evidence, not an inferred grant of instance authorization. */
export function describePermissionEvidence(clientConfigured: boolean, userRetrieved: boolean): string {
  const client = clientConfigured ? 'configured' : 'not configured';
  const user = clientConfigured && userRetrieved
    ? 'retrieved during configuration (cached; not a fresh authentication or instance-binding check)'
    : 'not verified';
  return `**Connection evidence**\n  • Client configuration: ${client}\n  • DHIS2 user/permission evidence: ${user}\n  • Local MCP policy does not establish DHIS2 authorization.\n  • Exposed tools are discovery information, not proof of working API access.`;
}
