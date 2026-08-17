import CreateUserForm from '../../components/CreateUserForm'

// Placeholder screen for this shell (SCRUM-64) - just the existing create
// form, relocated here. List/edit/deactivate UI is SCRUM-67's scope.
function AdminUsers() {
  return (
    <div>
      <h1>משתמשים</h1>
      <CreateUserForm />
    </div>
  )
}

export default AdminUsers
