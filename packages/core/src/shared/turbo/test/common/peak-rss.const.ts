export const TIME = '/usr/bin/time';

export const STRACE = '/usr/bin/strace';

export const KIB = 1024;

export const QUIET_STDIO: ['ignore', 'ignore', 'pipe'] = ['ignore', 'ignore', 'pipe'];

/** GNU `time -v` (Linux), in KiB. */
export const MAX_RSS_KIB = /Maximum resident set size \(kbytes\): (\d+)/;

/** BSD `time -l` (macOS), already in bytes. */
export const MAX_RSS_BYTES = /^\s*(\d+)\s+maximum resident set size/m;

export const PEAK_BYTES = /peak-bytes (\d+)/;

/** A successful `execve`, whole or as the `resumed` half `strace -f` splits off when another process interleaves. */
export const SUCCESSFUL_EXECVE = /(?:execve\(|<\.\.\. execve resumed>).*\)\s+= 0$/;

/** Peak working set of a finished child, read from its still-open handle; the exit code passes through. */
export const PEAK_SCRIPT = `param([string]$ArgsFile)
$ErrorActionPreference = 'Stop'
$all = Get-Content -Raw $ArgsFile | ConvertFrom-Json
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $all[0]
foreach ($arg in $all[1..($all.Count - 1)]) { $psi.ArgumentList.Add($arg) }
$psi.UseShellExecute = $false
$psi.RedirectStandardOutput = $false
$p = [System.Diagnostics.Process]::Start($psi)
$p.WaitForExit()
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class Psapi {
  [StructLayout(LayoutKind.Sequential)]
  public struct PROCESS_MEMORY_COUNTERS {
    public uint cb; public uint PageFaultCount;
    public UIntPtr PeakWorkingSetSize; public UIntPtr WorkingSetSize;
    public UIntPtr QuotaPeakPagedPoolUsage; public UIntPtr QuotaPagedPoolUsage;
    public UIntPtr QuotaPeakNonPagedPoolUsage; public UIntPtr QuotaNonPagedPoolUsage;
    public UIntPtr PagefileUsage; public UIntPtr PeakPagefileUsage;
  }
  [DllImport("psapi.dll", SetLastError = true)]
  public static extern bool GetProcessMemoryInfo(IntPtr process, out PROCESS_MEMORY_COUNTERS counters, uint size);
}
"@
$counters = New-Object Psapi+PROCESS_MEMORY_COUNTERS
$counters.cb = [System.Runtime.InteropServices.Marshal]::SizeOf($counters)
if (-not [Psapi]::GetProcessMemoryInfo($p.Handle, [ref]$counters, $counters.cb)) { throw 'GetProcessMemoryInfo failed' }
[Console]::Error.WriteLine("peak-bytes $($counters.PeakWorkingSetSize.ToUInt64())")
exit $p.ExitCode
`;

/**
 * turbo.exe processes whose command line names the daemon. `Get-Process turbo` would also match the outer
 * `pnpm turbo run` that CI runs this suite under.
 */
export const WINDOWS_DAEMON_PROBE =
  "Get-CimInstance Win32_Process -Filter \"Name='turbo.exe'\" | Where-Object CommandLine -match 'daemon' | ForEach-Object ProcessId";

export const POSIX_DAEMON_PATTERN = 'turbo.*daemon';
