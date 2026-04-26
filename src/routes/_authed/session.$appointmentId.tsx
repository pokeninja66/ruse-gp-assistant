import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/session/$appointmentId')({
  component: SessionLayout,
})

function SessionLayout() {
  return <Outlet />
}
