import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  return (
    <div>
      <h2 className="text-3xl font-bold">Dashboard</h2>
      <p className="text-gray-600 mt-2">
        Monitor EV battery, range, and charging status.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <Card className="rounded-2xl shadow-md">
          <CardHeader>
            <CardTitle>Battery Level</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-green-600">78%</p>
            <Badge className="mt-3">Good</Badge>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-md">
          <CardHeader>
            <CardTitle>Range Left</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-blue-600">240 km</p>
            <Badge variant="secondary" className="mt-3">
              Estimated
            </Badge>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-md">
          <CardHeader>
            <CardTitle>Charging Status</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">Not Charging</p>
            <Badge variant="outline" className="mt-3">
              Offline
            </Badge>
          </CardContent>
        </Card>
      </div>

      <div className="mt-10">
        <h3 className="text-2xl font-semibold">Recent Trips</h3>

        <div className="mt-4 bg-white rounded-2xl shadow-md p-5">
          <p className="text-gray-500">No trips recorded yet.</p>
        </div>
      </div>
    </div>
  );
}