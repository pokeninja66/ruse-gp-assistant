import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/session/$appointmentId/patient')({
  beforeLoad: ({ params }) => {
    // Redirect to patients page — user should arrive here from patient detail
    // This route serves as a breadcrumb target
    throw redirect({ to: '/patients' })
  },
  component: () => null,
})
