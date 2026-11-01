// A closed in-memory model for exercising initialization race behavior. This
// simulator cannot access a network or update a repository.
export function simulateInitialization({ plan, currentAccepted, currentOutput, existingState, race }) {
  let accepted = currentAccepted, output = currentOutput, state = existingState
  if (state != null) throw new Error('already initialized or recovery required')
  if (accepted !== plan.acceptedCommit || output !== plan.parent) throw new Error('initialization pins moved; replan')
  if (race === 'source-before-promotion') accepted = 'f'.repeat(40)
  if (race === 'output-before-promotion') output = 'e'.repeat(40)
  if (accepted !== plan.acceptedCommit || output !== plan.parent) throw new Error('initialization pins moved; replan')
  state = structuredClone(plan.state)
  return { result: 'simulated', accepted, parent: output, state, files: structuredClone(plan.files) }
}
