import React from 'react'
import { AppShell } from './components/AppShell'
import { FileList } from './components/FileList'
import { DiffView } from './components/DiffView'
import { DetailPanel } from './components/DetailPanel'
import './App.css'

function App() {
  return (
    <AppShell>
      <FileList />
      <DiffView />
      <DetailPanel />
    </AppShell>
  )
}

export default App
