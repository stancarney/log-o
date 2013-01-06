
# Log-o

Log-o is a centralized log server designed to meet PCI DSS V2 logging requirements. Specifically:

| PCI Section | PCI Description | Responsibility |
| ------------ | ------------- | ------------ |
| 10.5 | Secure audit trails so they cannot be altered. | * **Log-o**: Doesn't allow editing or deleting of historical log entries. <br/>* **You**: Logo-o should be installed on several clustered servers and isolated from the the rest of the cardholder environment. Only remote access for administration and incoming syslog traffic should be allowed in. |
| 10.5.1 | Limit viewing of audit trails to those with a job-related need.| * **Log-o**: Allows for the creation and deletion of named users with individual roles. <br/>* **You**: Create individual user accounts and enforce access requirements. |
| 10.5.2 | Protect audit trail files from unauthorized modifications. | * **Log-o**: Collects remote Syslog traffic and stores it away from the systems that originally generated the syslog message. Each stored message contains several hashes (including the hash of the previous record created by a log server) making it possible to detect tampering. <br/>* **You**: Ensure the datastore and operating system are properly patched, hardened and properly firewalled. |
| 10.5.3 | Promptly back up audit trail files to a centralized log server or media that is difficult to alter. | * **Log-o**: Collects remote syslog traffic at the time the message was generated on a remote system. <br/>* **You**: Ensure remote systems are configured to send messages to Log-o. |
| 10.5.4 | Write logs for external-facing technologies onto a log server on the internal LAN. | * **Log-o**: Same as 10.5.3. <br/>* **You**: Ensure all cardholder environment servers are able to send messages remotely to Log-o. |
| 10.5.5 | Use file-integrity monitoring or change-detection software on logs to ensure that existing log data cannot be changed without generating alerts (although new data being added should not cause an alert). | * **Log-o**: Stores messages in a Mongodb datastore and internally hashes each incoming message at the application level. <br/>* **You**: Ensure Mongodb or the underlying server has not been tampered with. |
| 10.6 | Review logs for all system components at least daily. Log reviews must include those servers that perform security functions like intrusion-detection system (IDS) and authentication, authorization, and accounting protocol (AAA) servers (for example, RADIUS). | * **Log-o**: Provides audited access in which to remotely view and filter collected logs.<br/>* **You**: Review the logs at least daily.|

## Log-o Configuration

![Log-o Configuration Diagram](https://raw.github.com/stancarney/log-o/master/docs/Log-o%20Configuration%20Diagram.png  "Log-o Configuration Diagram")

===

## License 

(GPLv3 License http://www.gnu.org/licenses/gpl-3.0.html)

Copyright (c) 2012 Stan Carney &lt;stan.carney@rootsh.me&gt;

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
