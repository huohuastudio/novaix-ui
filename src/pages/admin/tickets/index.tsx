import { Routes, Route } from "react-router-dom"
import TicketList from "./list"
import TicketDetail from "./detail"

export default function Tickets() {
  return (
    <Routes>
      <Route index element={<TicketList />} />
      <Route path=":id" element={<TicketDetail />} />
    </Routes>
  )
}
