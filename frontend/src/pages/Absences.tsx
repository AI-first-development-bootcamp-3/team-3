import { useNavigate } from 'react-router-dom'
import ManualAbsence from '../components/ManualAbsence'

/**
 * No sibling Work-tab state to switch into from a direct /absences visit
 * (unlike the nested tab reached from Reports.tsx's דיווח ידני flow), so no
 * onSwitchToWork is passed - the Work tab renders disabled here, same
 * convention ManualReport already uses when it has nothing to switch to.
 */
function Absences() {
  const navigate = useNavigate()
  return <ManualAbsence onClose={() => navigate('/')} />
}

export default Absences