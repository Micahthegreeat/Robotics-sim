### forward
`public void robot.forward(int x)`

Makes the robot move forward x inches.

### turn
`public void robot.turn(double x)`

Makes the robot turn x degrees clockwise.

To convert the amount of degrees to the length you need to turn per side you can use the following trigonometry formula

```
degrees * (3.1415/180) * width_of_the_robot
```

### getX
`public int robot.getX()`

returns the current x coordinate location.

### getY
`public int robot.getY()`

returns the current Y coordinate location.

### readAprilTag
`public int robot.readAprilTag`

Returns the april tag ID read. In this implementation it returns a random number.





returns the current x coordinate location.
