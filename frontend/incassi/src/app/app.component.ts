import {Component, OnInit} from '@angular/core'
import {RouterOutlet} from '@angular/router'
import {initFlowbite} from 'flowbite'
import {BottomNavComponent} from './bottom-nav/bottom-nav.component'

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, BottomNavComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  title = 'incassi'

  ngOnInit(): void {
    initFlowbite()
    this.updateTheme(this.isDarkMode())
  }

  private isDarkMode(): boolean {
    return (
      localStorage.getItem('color-theme') === 'dark' ||
      (!('color-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
    )
  }

  private updateTheme(isDark: boolean): void {
    const darkIcon = document.getElementById('theme-toggle-dark-icon')
    const lightIcon = document.getElementById('theme-toggle-light-icon')

    if (isDark) {
      document.documentElement.classList.add('dark')
      lightIcon?.classList.remove('hidden')
      darkIcon?.classList.add('hidden')
    } else {
      document.documentElement.classList.remove('dark')
      darkIcon?.classList.remove('hidden')
      lightIcon?.classList.add('hidden')
    }

    localStorage.setItem('color-theme', isDark ? 'dark' : 'light')
  }

  switchMode(): void {
    const currentMode = this.isDarkMode()
    this.updateTheme(!currentMode)
  }
}
