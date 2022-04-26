# Inviting and Removing Team Members

### Inviting team members
The owner of a team can invite members by clicking on the “Invite” button located at the bottom of the page. This brings up a text field where they can add an email to send the invitation to:
![Inviting a member](https://github.com/sarantharma/GyroscopicProject/blob/passport/User%20Guides/img/invite.png)

After entering an email and clicking “Send”, the new member is added to the team:
![New member added](https://github.com/sarantharma/GyroscopicProject/blob/passport/User%20Guides/img/new_member.png)

This also sends an invitation email to the invitee’s email using a dynamic Sendgrid template, including a link to the team’s page:
![Invitation email](https://github.com/sarantharma/GyroscopicProject/blob/passport/User%20Guides/img/invitation_email.png)

#### Note on adding team members: Pseudo-users
If the invitee email is already associated with an existing account, they are simply added to the team's members list.
In the case that the invitee email is not associated with an existing account, they are added to the users collection as a *pseudo-user*. This means that a user object is added to the collection consisting of only the provided email and an ID. This pseudo-user is added to the team's members list but is not visible to anyone, including the team's owner. Once a user has gone through the signup process having entered the associated email, the existing pseudo-user account is updated to include the username and (encrypted) password from the signup form. Then, when the user signs in for the first time they are already a member of the teams they were invited to.

### Removing team members
The team owner can also remove members from the team by clicking their respective “Remove” buttons:
![Removing a team member](https://github.com/sarantharma/GyroscopicProject/blob/passport/User%20Guides/img/remove.png)
